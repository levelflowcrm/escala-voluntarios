import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaAgenda, type EventoAgenda } from "./tela";

export default async function Agenda() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const { data: master } = await supabase.rpc("sou_admin_master");
  // Todos os eventos da igreja que ainda não terminaram (fim, ou início quando não há fim)
  const ontem = new Date(Date.now() - 86_400_000).toISOString();
  const { data } = await supabase
    .from("eventos")
    .select("id, titulo, inicio, fim, local, observacao, tipo_agenda, cor, serie_id, convocacao_geral")
    .gte("inicio", ontem)
    .order("inicio");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Agenda da igreja</h1>
      <p className="text-sm text-neutral-500">Os próximos eventos da igreja. Cada evento também aparece na escala dos ministérios, e o coordenador pode dispensá-lo para o time dele. Só o administrador cadastra eventos.</p>
      <TelaAgenda eventos={(data ?? []) as EventoAgenda[]} admin={!!master} />
    </main>
  );
}
