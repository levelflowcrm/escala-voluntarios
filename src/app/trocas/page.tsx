import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoAcao } from "./botoes";

type Troca = {
  id: string;
  direcao: "recebida" | "enviada";
  outra_pessoa: string;
  titulo: string;
  inicio: string;
  funcao: string;
  ministerio: string;
};

export default async function Trocas() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data } = await supabase.rpc("minhas_trocas");
  const lista = (data ?? []) as Troca[];
  const recebidas = lista.filter((t) => t.direcao === "recebida");
  const enviadas = lista.filter((t) => t.direcao === "enviada");

  const quando = (t: Troca) => (
    <p className="font-medium capitalize">{fmtDataHora.format(new Date(t.inicio))}</p>
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Trocas</h1>
      <p className="text-sm text-neutral-500">
        Não pode servir numa data? Peça a um colega apto e disponível. Se ele aceitar, a escala muda sozinha.
        Para pedir, abra “Pedir troca” em uma das suas escalas na tela inicial.
      </p>

      {lista.length === 0 && <p className="text-neutral-500">Nenhum pedido de troca no momento.</p>}

      {recebidas.length > 0 && <h2 className="text-sm font-medium text-neutral-500">Pedidos para você</h2>}
      {recebidas.map((t) => (
        <article key={t.id} className="flex flex-col gap-2 rounded-xl border border-violet-300 p-4 dark:border-violet-800">
          {quando(t)}
          <p>{t.titulo} · {t.funcao}</p>
          <p className="text-sm text-neutral-500">{t.ministerio} · <strong>{t.outra_pessoa}</strong> pediu para você cobrir</p>
          <div className="flex gap-2">
            <BotaoAcao rotulo="Aceitar" destaque operacao={{ tipo: "responderTroca", troca: t.id, aceitar: true }} />
            <BotaoAcao rotulo="Não posso" operacao={{ tipo: "responderTroca", troca: t.id, aceitar: false }} />
          </div>
        </article>
      ))}

      {enviadas.length > 0 && <h2 className="text-sm font-medium text-neutral-500">Pedidos que você fez</h2>}
      {enviadas.map((t) => (
        <article key={t.id} className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
          {quando(t)}
          <p>{t.titulo} · {t.funcao}</p>
          <p className="text-sm text-neutral-500">Aguardando <strong>{t.outra_pessoa}</strong> responder</p>
          <BotaoAcao rotulo="Cancelar pedido" operacao={{ tipo: "cancelarTroca", troca: t.id }} />
        </article>
      ))}
    </main>
  );
}
