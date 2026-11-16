"use client";

import { CORES } from "@/lib/cores-evento";

/** Escolha da cor pastel de um evento. Valor vazio = padrão ("Automática"). */
export function SeletorCor({ valor, aoMudar, rotulo = "Cor do evento (para dar destaque)" }: { valor: string; aoMudar: (cor: string) => void; rotulo?: string }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs text-neutral-500">{rotulo}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => aoMudar("")}
          aria-pressed={!valor}
          className={`h-9 rounded-full border px-3 text-xs ${!valor ? "border-violet-600 font-medium" : "border-neutral-300 dark:border-neutral-700"}`}
        >
          Automática
        </button>
        {Object.entries(CORES).map(([k, c]) => (
          <button
            key={k}
            type="button"
            title={c.nome}
            aria-label={c.nome}
            aria-pressed={valor === k}
            onClick={() => aoMudar(k)}
            className={`h-9 w-9 rounded-full border-2 ${c.bolinha} ${valor === k ? "ring-2 ring-violet-600 ring-offset-2 dark:ring-offset-neutral-900" : ""}`}
          />
        ))}
      </div>
    </fieldset>
  );
}
