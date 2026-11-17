"use client";

import { useState, useTransition } from "react";
import { TERMOMETRO } from "@/lib/maisfeliz";
import { votarMaisFeliz } from "./acoes";

/** "Como foi hoje?": o voluntário toca num emoji; o voto é anônimo. */
export function CartaoMaisFeliz({ eventoId, titulo }: { eventoId: string; titulo: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  if (feito) {
    return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">💜 Obrigado por contar como foi! Sua resposta é anônima.</p>;
  }
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-violet-300 p-4 dark:border-violet-800">
      <div>
        <h2 className="font-medium">Como foi hoje?</h2>
        <p className="text-sm text-neutral-500">{titulo} · só o líder vê o resumo, ninguém vê quem respondeu.</p>
      </div>
      <div className="flex justify-between gap-1">
        {TERMOMETRO.map((t) => (
          <button
            key={t.nota}
            disabled={pendente}
            aria-label={t.rotulo}
            onClick={() =>
              iniciar(async () => {
                const r = await votarMaisFeliz(eventoId, t.nota);
                setErro(r.erro);
                if (!r.erro) setFeito(true);
              })
            }
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-3xl hover:bg-violet-50 disabled:opacity-50 dark:hover:bg-violet-950/40"
          >
            {t.emoji}
            <span className="text-[10px] leading-none text-neutral-500">{t.rotulo}</span>
          </button>
        ))}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </section>
  );
}
