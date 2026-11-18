import Link from "next/link";
import { redirect } from "next/navigation";
import { diaNoFuso } from "@/lib/datas";
import { montarFaixa } from "@/lib/faixa-dias";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FaixaDias, type MinhaEscala } from "./faixa";
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

  const eventos = (data ?? []) as EventoAgenda[];

  // Minhas escalas (pendentes e confirmadas) para destacar os dias em que eu sirvo
  const { data: minhasEscalas } = await supabase
    .from("escalas")
    .select("evento_id, status, funcoes(nome), ministerios(nome), eventos!inner(inicio)")
    .eq("pessoa_id", eu)
    .in("status", ["pendente", "confirmado"])
    .gte("eventos.inicio", ontem);
  const minhas: MinhaEscala[] = (minhasEscalas ?? []).map((m) => ({
    eventoId: m.evento_id as string,
    funcao: (m.funcoes as unknown as { nome: string } | null)?.nome ?? "",
    ministerio: (m.ministerios as unknown as { nome: string } | null)?.nome ?? "",
    status: m.status as MinhaEscala["status"],
  }));

  const hoje = diaNoFuso(new Date());
  const eventosDia = eventos.map((e) => ({ id: e.id, titulo: e.titulo, inicio: e.inicio, local: e.local, tipo_agenda: e.tipo_agenda, cor: e.cor, dia: diaNoFuso(new Date(e.inicio)) }));
  const porDia = new Map<string, number>();
  for (const e of eventosDia) porDia.set(e.dia, (porDia.get(e.dia) ?? 0) + 1);
  const idsMeus = new Set(minhas.map((m) => m.eventoId));
  const escaladoEm = new Set(eventosDia.filter((e) => idsMeus.has(e.id)).map((e) => e.dia));
  const faixa = montarFaixa(hoje, porDia, escaladoEm, 30);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Agenda da igreja</h1>
      <p className="text-sm text-neutral-500">Os próximos eventos da igreja. Cada evento também aparece na escala dos ministérios, e o coordenador pode dispensá-lo para o time dele. Só o administrador cadastra eventos.</p>
      <FaixaDias faixa={faixa} eventos={eventosDia} minhas={minhas} />
      <h2 className="mt-2 text-sm font-medium text-neutral-500">Todos os próximos eventos</h2>
      <TelaAgenda eventos={eventos} admin={!!master} />
    </main>
  );
}
