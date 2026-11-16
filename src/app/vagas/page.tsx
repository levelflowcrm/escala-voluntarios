import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoAssumir } from "./botao";

export default async function Vagas() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const { data: vagas } = await supabase.rpc("vagas_abertas");
  const lista = (vagas ?? []) as {
    evento_id: string;
    funcao_id: string;
    titulo: string;
    inicio: string;
    funcao: string;
    ministerio: string;
    recusou: string;
  }[];
  lista.sort((a, b) => a.inicio.localeCompare(b.inicio));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Vagas abertas</h1>
      <p className="text-sm text-neutral-500">
        Quando alguém recusa, a data volta para o mural e qualquer voluntário apto pode assumir — sem o coordenador
        precisar caçar substituto no grupo.
      </p>
      {lista.length === 0 && <p className="text-neutral-500">Nenhuma vaga aberta para você agora. 🙌</p>}
      {lista.map((v) => (
        <article key={`${v.evento_id}-${v.funcao_id}`} className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium capitalize">{fmtDataHora.format(new Date(v.inicio))}</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Aberta</span>
          </div>
          <p>{v.titulo} · função: {v.funcao}</p>
          <p className="text-sm text-neutral-500">{v.ministerio} · vaga de {v.recusou}</p>
          <BotaoAssumir eventoId={v.evento_id} funcaoId={v.funcao_id} />
        </article>
      ))}
    </main>
  );
}
