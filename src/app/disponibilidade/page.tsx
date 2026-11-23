import { redirect } from "next/navigation";
import type { Periodo } from "@/lib/escala/sugerir";
import { criarClienteServidor } from "@/lib/supabase/server";
import { proximoMes } from "@/lib/disponibilidade-mes";
import { turnosDosCultos } from "@/lib/turnos";
import type { Atalho } from "./acoes";
import { TelaDisponibilidade, type RegraTurno } from "./tela";

export default async function Disponibilidade() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [{ data: tipos }, { data: indisp }, { data: bloqueios }, { data: pref }, { data: marcados }, { data: eventos }] = await Promise.all([
    supabase.from("tipos_evento").select("nome, dia_semana, hora").eq("ativo", true).not("dia_semana", "is", null),
    supabase.from("indisponibilidades").select("dia_semana, periodo, ordem_no_mes").eq("pessoa_id", eu),
    supabase.from("bloqueios").select("id, inicio, fim, motivo").eq("pessoa_id", eu).gte("fim", hoje).order("inicio"),
    supabase.from("preferencias").select("limite_mensal, observacao, so_dias_marcados").eq("pessoa_id", eu).maybeSingle(),
    supabase.from("dias_disponiveis").select("dia").eq("pessoa_id", eu).gte("dia", hoje),
    supabase.from("eventos").select("inicio").gte("inicio", new Date().toISOString()).lt("inicio", new Date(Date.now() + 200 * 86400000).toISOString()),
  ]);

  const prox = proximoMes(hoje);
  const { data: informado } = await supabase.from("disponibilidade_informada").select("mes").eq("mes", prox.mes).maybeSingle();

  const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const diasComEvento = [...new Set((eventos ?? []).map((e) => fmtDia.format(new Date(e.inicio))))];

  // Atalho ativo: só reconhece quando as regras por dia da semana são exatamente as do atalho
  const diasBloqueados = (indisp ?? []).filter((i) => i.periodo === null && i.ordem_no_mes === null).map((i) => i.dia_semana).sort();
  const soDiasInteiros = (indisp ?? []).length === diasBloqueados.length;
  const atalho: Atalho | null = !soDiasInteiros
    ? null
    : diasBloqueados.length === 0
      ? "todos"
      : diasBloqueados.join() === "1,2,3,4,5"
        ? "fim_de_semana"
        : diasBloqueados.join() === "0,6"
          ? "semana"
          : null;

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
      atalho={atalho}
      marcados={(marcados ?? []).map((m) => m.dia as string)}
      diasComEvento={diasComEvento}
      soDiasMarcados={pref?.so_dias_marcados ?? false}
      mesParaConfirmar={informado ? null : prox.nome}
    />
  );
}
