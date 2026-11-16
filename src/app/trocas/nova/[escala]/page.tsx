import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { pedirTroca } from "../../acoes";
import { BotaoAcao } from "../../botoes";

export default async function NovaTroca({ params }: { params: Promise<{ escala: string }> }) {
  const { escala } = await params;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const { data: esc } = await supabase
    .from("escalas")
    .select("id, eventos!inner(titulo, inicio), funcoes(nome)")
    .eq("id", escala)
    .eq("pessoa_id", eu)
    .maybeSingle();
  if (!esc) redirect("/");
  const ev = esc.eventos as unknown as { titulo: string; inicio: string };
  const funcao = (esc.funcoes as unknown as { nome: string } | null)?.nome;
  const { data: colegas } = await supabase.rpc("colegas_para_troca", { p_escala: escala });
  const lista = (colegas ?? []) as { pessoa_id: string; nome: string }[];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Pedir troca</h1>
      <p>
        <span className="font-medium capitalize">{fmtDataHora.format(new Date(ev.inicio))}</span>
        <br />
        <span className="text-neutral-500">{ev.titulo}{funcao && ` · ${funcao}`}</span>
      </p>
      <p className="text-sm text-neutral-500">
        Escolha um colega apto para esta função e disponível neste dia. Ele recebe o pedido e, se aceitar, assume
        a data no seu lugar.
      </p>
      {lista.length === 0 && <p className="text-neutral-500">Nenhum colega disponível para cobrir essa data agora. Fale com o coordenador.</p>}
      {lista.map((c) => (
        <div key={c.pessoa_id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-300 p-3 dark:border-neutral-700">
          <span className="font-medium">{c.nome}</span>
          <BotaoAcao rotulo="Pedir" destaque acao={() => pedirTroca(escala, c.pessoa_id)} voltarPara="/trocas" />
        </div>
      ))}
    </main>
  );
}
