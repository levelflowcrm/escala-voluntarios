import Link from "next/link";
import type { Carga, Nivel } from "@/lib/termometro";

const COR: Record<Nivel, { texto: string; barra: string; ponto: string; chip: string }> = {
  alta: { texto: "Carga alta", barra: "bg-red-500", ponto: "bg-red-500", chip: "text-red-700 dark:text-red-300" },
  equilibrada: { texto: "Equilibrada", barra: "bg-emerald-500", ponto: "bg-emerald-500", chip: "text-emerald-700 dark:text-emerald-300" },
  baixa: { texto: "Sem escalas", barra: "bg-neutral-400 dark:bg-neutral-600", ponto: "bg-neutral-400 dark:bg-neutral-600", chip: "text-neutral-500" },
};
const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const num = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

export function TelaTermometro({ linhas }: { linhas: (Carga & { nivel: Nivel })[] }) {
  const total = linhas.reduce((s, l) => s + l.noventa, 0);
  const media = linhas.length ? total / linhas.length : 0;
  const max = Math.max(1, ...linhas.map((l) => l.noventa));
  const porNivel: Record<Nivel, number> = {
    alta: linhas.filter((l) => l.nivel === "alta").length,
    equilibrada: linhas.filter((l) => l.nivel === "equilibrada").length,
    baixa: linhas.filter((l) => l.nivel === "baixa").length,
  };
  const niveis: Nivel[] = ["alta", "equilibrada", "baixa"];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Termômetro do time</h1>
      <p className="text-sm text-neutral-500">Escalas de cada pessoa nos últimos 90 dias. Ajuda a dividir melhor e a cuidar de quem serve muito.</p>

      {linhas.length === 0 ? (
        <p className="text-neutral-500">Ainda não há voluntários no time.</p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900">
              <p className="text-2xl font-semibold">{total}</p>
              <p className="text-xs text-neutral-500">escalas em 90 dias</p>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900">
              <p className="text-2xl font-semibold">{num(media)}</p>
              <p className="text-xs text-neutral-500">média por pessoa</p>
            </div>
            <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-900">
              <p className="text-2xl font-semibold">{linhas.length}</p>
              <p className="text-xs text-neutral-500">pessoas no time</p>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-neutral-500">Como o time está distribuído</h2>
            <div className="flex h-4 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="img" aria-label={niveis.map((n) => `${porNivel[n]} ${COR[n].texto.toLowerCase()}`).join(", ")}>
              {niveis.map((n) =>
                porNivel[n] > 0 ? <div key={n} className={COR[n].barra} style={{ width: `${(porNivel[n] / linhas.length) * 100}%` }} /> : null,
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {niveis.map((n) => (
                <span key={n} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${COR[n].ponto}`} />
                  <span className="text-neutral-500">{COR[n].texto}</span>
                  <strong>{porNivel[n]}</strong>
                </span>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-neutral-500">Escalas por pessoa (90 dias)</h2>
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <span className="inline-block h-3 border-l-2 border-dashed border-neutral-400" /> média {num(media)}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {linhas.map((l) => (
                <li key={l.pessoaId} className="grid grid-cols-[6.5rem_1fr_1.75rem] items-center gap-x-2">
                  <span className="truncate text-sm" title={l.nome}>{l.nome}</span>
                  <div className="relative h-5 rounded-md bg-neutral-100 dark:bg-neutral-900">
                    {l.noventa > 0 && (
                      <div className={`h-5 rounded-md ${COR[l.nivel].barra}`} style={{ width: `${(l.noventa / max) * 100}%` }} />
                    )}
                    <div className="absolute inset-y-0 border-l-2 border-dashed border-neutral-400" style={{ left: `${(media / max) * 100}%` }} aria-hidden />
                  </div>
                  <span className="text-right text-sm font-semibold">{l.noventa}</span>
                  <span />
                  <p className="col-span-2 text-[11px] text-neutral-500">
                    <span className={COR[l.nivel].chip}>{COR[l.nivel].texto}</span> · {l.mes} neste mês
                    {l.ultimo && ` · último serviço ${fmtData.format(new Date(l.ultimo))}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
