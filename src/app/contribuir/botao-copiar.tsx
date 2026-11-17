"use client";

import { useState } from "react";

export function BotaoCopiar({ texto, rotulo, secundario }: { texto: string; rotulo: string; secundario?: boolean }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie o texto abaixo:", texto);
    }
  }

  return (
    <button
      onClick={copiar}
      className={
        secundario
          ? "h-11 rounded-xl border border-neutral-300 font-medium dark:border-neutral-700"
          : "h-11 rounded-xl bg-violet-600 font-medium text-white hover:bg-violet-700"
      }
    >
      {copiado ? "Copiado ✓" : rotulo}
    </button>
  );
}
