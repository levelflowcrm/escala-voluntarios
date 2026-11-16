import { redirect } from "next/navigation";
import type { Periodo } from "@/lib/escala/sugerir";
import { criarClienteServidor } from "@/lib/supabase/server";
import { turnosDosCultos } from "@/lib/turnos";
import { TelaDisponibilidade, type RegraTurno } from "./tela";

export default async function Disponibilidade() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [{ data: tipos }, { data: indisp }, { data: bloqueios }, { data: pref }] = await Promise.all([
    supabase.from("tipos_evento").select("nome, dia_semana, hora").eq("ativo", true).not("dia_semana", "is", null),
    supabase.from("indisponibilidades").select("dia_semana, periodo, ordem_no_mes").eq("pessoa_id", eu),
    supabase.from("bloqueios").select("id, inicio, fim, motivo").eq("pessoa_id", eu).gte("fim", hoje).order("inicio"),
    supabase.from("preferencias").select("limite_mensal, observacao").eq("pessoa_id", eu).maybeSingle(),
  ]);

  const turnos = turnosDosCultos(tipos ?? []).map((t) => {
    const minhas = (indisp ?? []).filter(
      (i) => i.dia_semana === t.diaSemana && (i.periodo === t.periodo || i.periodo === null),
    );
    const regra: RegraTurno = minhas.some((i) => i.ordem_no_mes === null)
      ? "nunca"
      : minhas.length
        ? minhas.map((i) => i.ordem_no_mes as number).sort()
        : "sempre";
    return { ...t, regra };
  });

  return (
    <TelaDisponibilidade
      turnos={turnos as { diaSemana: number; periodo: Periodo; cultos: string[]; regra: RegraTurno }[]}
      bloqueios={bloqueios ?? []}
      hoje={hoje}
      limite={pref?.limite_mensal ?? null}
      observacao={pref?.observacao ?? ""}
    />
  );
}
