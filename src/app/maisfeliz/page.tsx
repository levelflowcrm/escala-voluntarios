import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { emojiDaMedia, MIN_VOTOS, TERMOMETRO } from "@/lib/maisfeliz";
import { criarClienteServidor } from "@/lib/supabase/server";

type Linha = {
  evento_id: string; evento: string; inicio: string; ministerio: string; total: number;
  n1: number | null; n2: number | null; n3: number | null; n4: number | null; n5: number | null; media: number | null;
};

export default async function MaisFelizDoTime() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: coordenador } = await supabase.rpc("sou_coordenador_algum");
  if (!coordenador) redirect("/");
  const { data } = await supabase.rpc("resumo_maisfeliz");
  const lista = (data ?? []) as Linha[];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">MaisFeliz do time 😊</h1>
      <p className="text-sm text-neutral-500">
        Como o time sentiu cada culto, nos últimos 60 dias. As respostas são anônimas: o resumo só aparece com {MIN_VOTOS} respostas ou mais.
      </p>
      {lista.length === 0 && <p className="text-neutral-500">Ainda não há respostas. Elas aparecem depois que o time avaliar um culto.</p>}
      {lista.map((r) => {
        const contagens = [r.n1, r.n2, r.n3, r.n4, r.n5];
        return (
          <article key={`${r.evento_id}${r.ministerio}`} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{r.evento}</p>
                <p className="text-xs capitalize text-neutral-500">{fmtDataHora.format(new Date(r.inicio))} · {r.ministerio}</p>
              </div>
              {r.media != null && (
                <div className="text-right">
                  <p className="text-2xl leading-none">{emojiDaMedia(Number(r.media))}</p>
                  <p className="text-xs text-neutral-500">média {Number(r.media).toFixed(1).replace(".", ",")}</p>
                </div>
              )}
            </div>
            {r.media == null ? (
              <p className="text-sm text-neutral-500">
                {r.total} {r.total === 1 ? "resposta" : "respostas"} até agora. Faltam {MIN_VOTOS - r.total} para mostrar o resumo.
              </p>
            ) : (
              <div className="flex justify-between text-center">
                {TERMOMETRO.map((t, i) => (
                  <div key={t.nota} className="flex flex-1 flex-col items-center">
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="text-sm font-medium">{contagens[i]}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </main>
  );
}
