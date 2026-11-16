import { redirect } from "next/navigation";
import { diaNoFuso } from "@/lib/datas";
import { ministeriosQueCoordeno } from "@/lib/ministerios";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaCultosFixos, type CultoFixo, type PausaCulto } from "./tela";

export default async function CultosFixos() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const ministerios = await ministeriosQueCoordeno(supabase, eu);
  if (ministerios.length === 0) redirect("/");

  const hoje = diaNoFuso(new Date());
  const [{ data: cultos }, { data: pausas }] = await Promise.all([
    supabase.from("tipos_evento").select("id, nome, dia_semana, hora, ativo").not("dia_semana", "is", null).order("dia_semana").order("hora"),
    supabase.from("pausas_cultos").select("id, tipo_evento_id, de, ate, motivo").gte("ate", hoje).order("de"),
  ]);

  return (
    <TelaCultosFixos
      cultos={((cultos ?? []) as { id: string; nome: string; dia_semana: number; hora: string | null; ativo: boolean }[]).map(
        (c): CultoFixo => ({ id: c.id, nome: c.nome, diaSemana: c.dia_semana, hora: (c.hora ?? "19:00").slice(0, 5), ativo: c.ativo }),
      )}
      pausas={(pausas ?? []) as PausaCulto[]}
    />
  );
}
