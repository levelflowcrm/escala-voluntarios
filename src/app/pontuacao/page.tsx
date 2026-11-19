import Link from "next/link";
import { redirect } from "next/navigation";
import { dadosDoNivel, ITENS, NIVEIS, progressoNivel, type Pontuacao } from "@/lib/pontuacao";
import { criarClienteServidor } from "@/lib/supabase/server";

type LinhaTime = Pontuacao & { pessoa_id: string; pessoa: string };

export default async function PaginaPontuacao() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const [{ data: minha }, { data: coordenador }] = await Promise.all([
    supabase.rpc("minha_pontuacao"),
    supabase.rpc("sou_coordenador_algum"),
  ]);
  const p = ((minha ?? []) as Pontuacao[])[0];
  const time = coordenador ? (((await supabase.rpc("pontuacao_do_time")).data ?? []) as LinhaTime[]) : [];
  const nivel = dadosDoNivel(p?.nivel ?? "semente");
  const prog = progressoNivel(p?.pontos ?? 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Minha pontuação</h1>

      <section className="flex flex-col gap-3 rounded-2xl bg-violet-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-violet-100">Últimos 90 dias</p>
            <p className="text-4xl font-bold">{p?.pontos ?? 0} <span className="text-base font-medium">pontos</span></p>
          </div>
          <div className="text-right">
            <p className="text-4xl">{nivel.emoji}</p>
            <p className="text-sm font-medium">{nivel.rotulo}</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${prog.percentual}%` }} />
        </div>
        <p className="text-sm text-violet-100">
          {prog.proximo ? <>Faltam <strong>{prog.faltam}</strong> pontos para {prog.proximo.emoji} {prog.proximo.rotulo}.</> : "Sua árvore já está dando frutos. Obrigado por servir tão bem!"}
        </p>
        {(p?.sequencia ?? 0) > 0 && <p className="rounded-xl bg-white/15 px-3 py-2 text-sm">🔥 {p.sequencia} {p.sequencia === 1 ? "escala seguida" : "escalas seguidas"} sem faltar</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Sua trilha</h2>
        <p className="text-xs text-neutral-500">Cada estágio mostra como você cresce ao servir com constância. Os pontos contam os últimos 90 dias.</p>
        <ol className="flex flex-col gap-2">
          {NIVEIS.map((n) => {
            const pontos = p?.pontos ?? 0;
            const atual = n.id === nivel.id;
            const conquistado = pontos >= n.minimo && !atual;
            return (
              <li
                key={n.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  atual
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
                    : "border-neutral-200 dark:border-neutral-800"
                } ${!atual && !conquistado ? "opacity-60" : ""}`}
              >
                <span className="w-12 shrink-0 text-center text-2xl">{n.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.rotulo}</p>
                  <p className="text-xs text-neutral-500">
                    {n.minimo === 0 ? "Ponto de partida" : `A partir de ${n.minimo} pontos`}
                  </p>
                </div>
                <span className="text-xs font-medium">
                  {atual ? "Você está aqui" : conquistado ? "✓ Conquistado" : `Faltam ${n.minimo - pontos}`}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-medium text-neutral-500">De onde vêm seus pontos</h2>
        {ITENS.map((i) => {
          const qtd = p ? Number(p[i.chave]) : 0;
          return (
            <p key={i.chave} className="flex justify-between border-b border-neutral-200 py-2 text-sm dark:border-neutral-800">
              <span>{i.rotulo} <span className="text-neutral-400">({i.ponto > 0 ? "+" : ""}{i.ponto} cada)</span></span>
              <strong>{qtd}</strong>
            </p>
          );
        })}
        <p className="flex justify-between border-b border-neutral-200 py-2 text-sm dark:border-neutral-800">
          <span>Sequência sem faltar <span className="text-neutral-400">(+2 cada, até 10)</span></span>
          <strong>{p?.sequencia ?? 0}</strong>
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Só você e o seu facilitador veem a sua pontuação. Não existe ranking público: a ideia é reconhecer quem serve com constância, não competir.
        </p>
      </section>

      {coordenador && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Pontuação do time</h2>
          {time.length === 0 && <p className="text-sm text-neutral-500">Nenhum voluntário nos seus ministérios ainda.</p>}
          {time.map((t) => {
            const n = dadosDoNivel(t.nivel);
            return (
              <article key={t.pessoa_id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div>
                  <p className="font-medium">{t.pessoa}</p>
                  <p className="text-xs text-neutral-500">
                    {t.servidas} {t.servidas === 1 ? "serviu" : "serviram"} · {t.no_horario} no horário · {t.recusou} recusas · {t.trocou} trocas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl leading-none">{n.emoji}</p>
                  <p className="text-sm font-semibold">{t.pontos}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
