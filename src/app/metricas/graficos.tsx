import type { ReactNode } from "react";

export type ItemGrafico = { rotulo: string; valor: number | null; dica: string };

/** Colunas por culto (um só tom). Ausente = sem coluna; linha de referência opcional (ex.: total de cadeiras). */
export function Colunas({ itens, referencia, titulo }: { itens: ItemGrafico[]; referencia?: { valor: number; rotulo: string }; titulo: string }) {
  const W = 640, H = 200, E = 36, D = 8, T = 10, B = 28;
  const max = Math.max(1, ...itens.map((i) => i.valor ?? 0), referencia?.valor ?? 0) * 1.08;
  const larg = (W - E - D) / Math.max(itens.length, 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const passo = Math.max(1, Math.ceil(itens.length / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo} className="w-full">
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line x1={E} x2={W - D} y1={y(max * p / 1.08)} y2={y(max * p / 1.08)} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth={1} />
          <text x={E - 6} y={y(max * p / 1.08) + 4} textAnchor="end" className="fill-neutral-500 text-[10px]">{Math.round(max * p / 1.08).toLocaleString("pt-BR")}</text>
        </g>
      ))}
      {referencia && (
        <g>
          <line x1={E} x2={W - D} y1={y(referencia.valor)} y2={y(referencia.valor)} className="stroke-neutral-400" strokeWidth={1} strokeDasharray="4 3" />
          <text x={W - D} y={y(referencia.valor) - 4} textAnchor="end" className="fill-neutral-500 text-[10px]">{referencia.rotulo}</text>
        </g>
      )}
      {itens.map((it, i) => {
        const x = E + i * larg + larg * 0.2;
        const w = Math.min(28, larg * 0.6);
        const cx = E + i * larg + larg / 2;
        return (
          <g key={i}>
            {it.valor != null && (
              <rect x={cx - w / 2} y={y(it.valor)} width={w} height={Math.max(1, H - B - y(it.valor))} rx={3} className="fill-blue-600 hover:fill-blue-500 dark:fill-blue-400 dark:hover:fill-blue-300">
                <title>{it.dica}</title>
              </rect>
            )}
            {i % passo === 0 && <text x={x + (larg * 0.6) / 2} y={H - 10} textAnchor="middle" className="fill-neutral-500 text-[10px]">{it.rotulo}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Cartão de número: valor grande, rótulo e (opcional) variação contra o período anterior. */
export function Numero({ rotulo, valor, detalhe, variacao, destaque }: { rotulo: string; valor: string; detalhe?: ReactNode; variacao?: number | null; destaque?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-4 ${destaque ? "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30" : "border-neutral-200 dark:border-neutral-800"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{rotulo}</p>
      <p className={`${destaque ? "text-4xl" : "text-3xl"} font-semibold tabular-nums`}>{valor}</p>
      {variacao != null && (
        <p className={`text-xs font-medium ${variacao >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
          {variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao).toLocaleString("pt-BR")}% <span className="font-normal text-neutral-500">vs período anterior</span>
        </p>
      )}
      {detalhe && <p className="text-xs text-neutral-500">{detalhe}</p>}
    </div>
  );
}

/** Lista de barras horizontais alinhadas (uma por linha), com o número à direita. */
export function BarrasLista({ linhas }: { linhas: { nome: string; valor: number | null; texto: string }[] }) {
  const max = Math.max(1, ...linhas.map((l) => l.valor ?? 0));
  return (
    <ul className="flex flex-col gap-2">
      {linhas.map((l) => (
        <li key={l.nome} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2 text-sm">
          <span className="truncate">{l.nome}</span>
          <span className="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
            {l.valor != null && <span className="block h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" style={{ width: `${Math.max(2, (l.valor / max) * 100)}%` }} />}
          </span>
          <span className="text-right tabular-nums text-neutral-600 dark:text-neutral-300">{l.texto}</span>
        </li>
      ))}
    </ul>
  );
}
