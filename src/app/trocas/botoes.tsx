"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Botão genérico que roda uma ação de servidor e mostra o erro, se houver. */
export function BotaoAcao({
  rotulo,
  acao,
  destaque = false,
  voltarPara,
}: {
  rotulo: string;
  acao: () => Promise<{ erro?: string }>;
  destaque?: boolean;
  voltarPara?: string;
}) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={ocupado}
        onClick={() =>
          iniciar(async () => {
            const r = await acao();
            setErro(r.erro ?? null);
            if (!r.erro && voltarPara) router.push(voltarPara);
          })
        }
        className={`h-11 rounded-xl px-4 text-sm font-medium disabled:opacity-60 ${
          destaque ? "bg-violet-600 text-white" : "border border-neutral-300 dark:border-neutral-700"
        }`}
      >
        {ocupado ? "Enviando…" : rotulo}
      </button>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
