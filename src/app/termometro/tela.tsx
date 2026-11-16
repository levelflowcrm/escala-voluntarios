import Link from "next/link";
import type { Carga, Nivel } from "@/lib/termometro";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ROTULO: Record<Nivel, { texto: string; classe: string }> = {
  alta: { texto: "Carga alta", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  equilibrada: { texto: "Equilibrada", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  baixa: { texto: "Sem escalas", classe: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
};
const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

export function TelaTermometro({
  linhas,
  aniversariantes,
  mes,
}: {
  linhas: (Carga & { nivel: Nivel })[];
  aniversariantes: { nome: string; dia: number }[];
  mes: number;
}) {
  const max = Math.max(1, ...linhas.map((l) => l.noventa));
  const altas = linhas.filter((l) => l.nivel === "alta").length;
  const baixas = linhas.filter((l) => l.nivel === "baixa").length;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Termômetro do time</h1>
      <p className="text-sm text-neutral-500">
        Escalas de cada pessoa nos últimos 90 dias. Ajuda a dividir melhor e a cuidar de quem serve muito.
        {altas > 0 && ` ${altas} com carga alta.`}
        {baixas > 0 && ` ${baixas} sem escalas no período.`}
      </p>

      <section className="flex flex-col gap-2">
        {linhas.map((l) => (
          <article key={l.pessoaId} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{l.nome}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs ${ROTULO[l.nivel].classe}`}>{ROTULO[l.nivel].texto}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-2 rounded-full bg-violet-600" style={{ width: `${(l.noventa / max) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {l.noventa} em 90 dias · {l.mes} neste mês
              {l.ultimo && ` · último serviço ${fmtData.format(new Date(l.ultimo))}`}
            </p>
          </article>
        ))}
        {linhas.length === 0 && <p className="text-neutral-500">Ainda não há voluntários no time.</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Aniversariantes de {MESES[mes - 1]} 🎂</h2>
        {aniversariantes.length === 0 && <p className="text-neutral-500">Ninguém faz aniversário neste mês (ou ainda não informaram).</p>}
        {aniversariantes.map((a) => (
          <p key={a.nome}>
            <span className="inline-block w-8 font-medium">{String(a.dia).padStart(2, "0")}</span> {a.nome}
          </p>
        ))}
      </section>
    </main>
  );
}
