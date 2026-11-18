import { redirect } from "next/navigation";
import { diaNoFuso } from "@/lib/datas";
import { proximosAniversarios } from "@/lib/aniversarios";
import { ministeriosQueCoordeno } from "@/lib/ministerios";
import { criarClienteServidor } from "@/lib/supabase/server";
import { aniversariantesDoMes } from "@/lib/termometro";
import { TelaAniversariantes } from "./tela";

export default async function Aniversariantes() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const ministerios = await ministeriosQueCoordeno(supabase, eu);
  if (ministerios.length === 0) redirect("/");

  const { data: membros } = await supabase.rpc("dados_do_time");
  const time = ((membros ?? []) as { nome: string; aniversario: string | null }[]).map((m) => ({ nome: m.nome, aniversario: m.aniversario }));
  const hoje = diaNoFuso(new Date());
  const mes = Number(hoje.slice(5, 7));
  return (
    <TelaAniversariantes
      mes={mes}
      doMes={aniversariantesDoMes(time, mes).map((a) => ({ ...a, passou: a.dia < Number(hoje.slice(8, 10)), hoje: a.dia === Number(hoje.slice(8, 10)) }))}
      proximos={proximosAniversarios(time, hoje, 30)}
      semData={time.filter((t) => !t.aniversario).length}
    />
  );
}
