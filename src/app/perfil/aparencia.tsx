"use client";

import { useEffect, useState } from "react";
import { aplicarAparencia, CHAVE_COR, CHAVE_TEMA, CORES, TEMAS } from "@/lib/aparencia";

/** Tema e cor de destaque. Ficam salvos neste aparelho (navegador) e valem na hora. */
export function Aparencia() {
  const [tema, setTema] = useState<string>("auto");
  const [cor, setCor] = useState<string>("roxo");

  useEffect(() => {
    // Lê a escolha salva só depois de montar (evita diferença entre servidor e navegador).
    try {
      setTema(localStorage.getItem(CHAVE_TEMA) ?? "auto");
      setCor(localStorage.getItem(CHAVE_COR) ?? "roxo");
    } catch {}
  }, []);

  const escolher = (t: string, c: string) => {
    setTema(t);
    setCor(c);
    try {
      localStorage.setItem(CHAVE_TEMA, t);
      localStorage.setItem(CHAVE_COR, c);
    } catch {}
    aplicarAparencia(t, c);
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-neutral-500">Aparência</h2>
      <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {TEMAS.map((t) => (
          <button
            key={t.id}
            onClick={() => escolher(t.id, cor)}
            className={`h-10 flex-1 rounded-lg text-sm font-medium ${tema === t.id ? "bg-white shadow-sm dark:bg-neutral-700" : "text-neutral-500"}`}
          >
            {t.nome}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {CORES.map((c) => (
          <button
            key={c.id}
            aria-label={`Cor ${c.nome}`}
            aria-pressed={cor === c.id}
            onClick={() => escolher(tema, c.id)}
            style={{ backgroundColor: c.amostra }}
            className={`h-10 w-10 rounded-full ${cor === c.id ? "ring-2 ring-offset-2 ring-neutral-900 dark:ring-white dark:ring-offset-neutral-900" : ""}`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500">A escolha fica salva neste aparelho.</p>
    </section>
  );
}
