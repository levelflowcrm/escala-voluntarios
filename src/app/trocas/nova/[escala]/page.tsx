import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
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

      <section className="flex flex-col gap-2 rounded-2xl border border-violet-300 p-4 dark:border-violet-800">
        <h2 className="font-medium">Abrir a vaga para o time</h2>
        <p className="text-sm text-neutral-500">
          Você deixa esta data e a vaga fica aberta. Os colegas aptos e disponíveis são avisados por WhatsApp e pelo app, e o primeiro que aceitar assume. O facilitador acompanha pelas vagas abertas.
        </p>
        <BotaoAcao rotulo="Abrir a vaga" destaque operacao={{ tipo: "abrirVaga", escala }} voltarPara="/" confirmar="Abrir a vaga? Você deixa de ficar escalado(a) nesta data e os colegas aptos serão avisados." />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Ou peça a um colega específico</h2>
        <p className="text-sm text-neutral-500">Ele recebe o pedido e, se aceitar, assume a data no seu lugar. Você continua escalado até ele aceitar.</p>
        {lista.length === 0 && <p className="text-sm text-neutral-500">Nenhum colega disponível para um pedido direto nesta data.</p>}
      </section>
      {lista.map((c) => (
        <div key={c.pessoa_id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-300 p-3 dark:border-neutral-700">
          <span className="font-medium">{c.nome}</span>
          <BotaoAcao rotulo="Pedir" destaque operacao={{ tipo: "pedirTroca", escala, colega: c.pessoa_id }} voltarPara="/trocas" />
        </div>
      ))}
    </main>
  );
}
