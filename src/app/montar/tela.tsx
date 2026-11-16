import Link from "next/link";
import { fmtMes, somarMes } from "@/lib/datas";
import { Grade, type EventoGrade } from "./grade";

/** Parte visual de Montar escala. */
export function TelaMontar({
  ministerios,
  ministerio,
  mes,
  temFuncoes,
  grade,
  aptos,
}: {
  ministerios: { id: string; nome: string }[];
  ministerio: { id: string; nome: string };
  mes: string;
  temFuncoes: boolean;
  grade: EventoGrade[];
  aptos: Record<string, { id: string; nome: string }[]>;
}) {
  const mesTexto = fmtMes.format(new Date(`${mes}-15T12:00:00-03:00`));
  const nomeMes = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);
  const link = (m: string, min = ministerio.id) => `/montar?min=${min}&mes=${m}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 py-8">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-neutral-500">
          ← Minhas escalas
        </Link>
        <h1 className="text-2xl font-semibold">Montar escala</h1>
        {ministerios.length > 1 && (
          <nav className="flex flex-wrap gap-2">
            {ministerios.map((m) => (
              <Link
                key={m.id}
                href={link(mes, m.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${m.id === ministerio.id ? "bg-violet-600 text-white" : "border border-neutral-300 dark:border-neutral-700"}`}
              >
                {m.nome}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
          <Link href={link(somarMes(mes, -1))} className="px-3 py-1 text-lg" aria-label="Mês anterior">
            ‹
          </Link>
          <p className="font-medium">
            {ministerio.nome} · {nomeMes}
          </p>
          <Link href={link(somarMes(mes, 1))} className="px-3 py-1 text-lg" aria-label="Próximo mês">
            ›
          </Link>
        </div>
      </header>

      {!temFuncoes ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {ministerio.nome} ainda não tem funções cadastradas. Assim que as funções e quem opera cada uma forem definidas,
          a escala pode ser montada aqui.
        </p>
      ) : (
        <Grade ministerioId={ministerio.id} mes={mes} eventos={grade} aptos={aptos} />
      )}
    </main>
  );
}
