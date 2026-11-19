import type { GrupoTime } from "@/lib/time-de-hoje";
import { fmtDataHora } from "@/lib/datas";

/** "Time de hoje": fotos de quem serve junto no mesmo ministério e evento. */
export function TimeDeHoje({ grupos }: { grupos: GrupoTime[] }) {
  if (grupos.length === 0) return null;
  return (
    <>
      {grupos.map((g) => (
        <section key={g.chave} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <h2 className="font-medium">Time de hoje · {g.ministerio}</h2>
            <p className="text-sm text-neutral-500">{g.evento} · {fmtDataHora.format(new Date(g.inicio))}</p>
          </div>
          <ul className="flex flex-wrap gap-4">
            {g.pessoas.map((p) => (
              <li key={p.pessoa_id} className={`flex w-16 flex-col items-center gap-1 text-center ${p.status === "pendente" ? "opacity-60" : ""}`}>
                <div className="relative">
                  {p.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto} alt={p.nome} className={`h-14 w-14 rounded-full object-cover ring-2 ${p.sou_eu ? "ring-violet-500" : "ring-neutral-200 dark:ring-neutral-700"}`} />
                  ) : (
                    <div aria-hidden className={`flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-700 ring-2 dark:bg-violet-950 dark:text-violet-300 ${p.sou_eu ? "ring-violet-500" : "ring-neutral-200 dark:ring-neutral-700"}`}>
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {p.aniversario_hoje && <span aria-label="aniversariante" className="absolute -right-1 -top-1 text-base">🎂</span>}
                </div>
                <span className="w-full truncate text-xs font-medium">{p.sou_eu ? "Você" : p.nome}</span>
                {p.funcao && <span className="w-full truncate text-[11px] text-neutral-500">{p.funcao}</span>}
              </li>
            ))}
          </ul>
          {g.pessoas.some((p) => p.status === "pendente") && <p className="text-xs text-neutral-500">Fotos mais claras: ainda não confirmaram.</p>}
        </section>
      ))}
    </>
  );
}
