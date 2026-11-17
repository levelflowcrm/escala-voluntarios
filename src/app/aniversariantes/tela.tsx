import Link from "next/link";
import type { Aniversariante } from "@/lib/aniversarios";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dd = (n: number) => String(n).padStart(2, "0");
const quando = (faltam: number) => (faltam === 0 ? "hoje 🎉" : faltam === 1 ? "amanhã" : `em ${faltam} dias`);

export function TelaAniversariantes({
  mes,
  doMes,
  proximos,
  semData,
}: {
  mes: number;
  doMes: { nome: string; dia: number; passou: boolean; hoje: boolean }[];
  proximos: Aniversariante[];
  semData: number;
}) {
  const hoje = proximos.filter((a) => a.faltam === 0);
  const proximosDias = proximos.filter((a) => a.faltam > 0);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Aniversariantes 🎂</h1>
      <p className="text-sm text-neutral-500">Dos voluntários dos ministérios que você coordena.</p>

      {hoje.length > 0 && (
        <section className="flex flex-col gap-1 rounded-2xl bg-violet-600 p-4 text-white">
          <h2 className="text-sm font-medium text-violet-100">Hoje 🎉</h2>
          {hoje.map((a) => <p key={a.nome} className="text-lg font-semibold">{a.nome}</p>)}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Próximos 30 dias</h2>
        {proximosDias.length === 0 && <p className="text-neutral-500">Ninguém faz aniversário nos próximos 30 dias.</p>}
        {proximosDias.map((a) => (
          <p key={a.nome} className="flex items-center justify-between border-b border-neutral-200 py-2 dark:border-neutral-800">
            <span>
              <span className="inline-block w-12 font-medium">{dd(a.dia)}/{dd(a.mes)}</span> {a.nome}
            </span>
            <span className="text-sm text-neutral-500">{quando(a.faltam)}</span>
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Aniversariantes de {MESES[mes - 1]}</h2>
        {doMes.length === 0 && <p className="text-neutral-500">Ninguém faz aniversário neste mês.</p>}
        {doMes.map((a) => (
          <p key={a.nome} className={a.passou ? "text-neutral-400" : ""}>
            <span className="inline-block w-8 font-medium">{dd(a.dia)}</span> {a.nome}
            {a.hoje && " 🎉"}
          </p>
        ))}
      </section>

      {semData > 0 && (
        <p className="text-xs text-neutral-500">
          {semData} {semData === 1 ? "pessoa ainda não informou" : "pessoas ainda não informaram"} a data de aniversário (cada um preenche em Perfil).
        </p>
      )}
    </main>
  );
}
