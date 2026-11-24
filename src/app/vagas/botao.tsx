"use client";

import { useState, useTransition } from "react";
import { anunciar } from "../animacao-pontos";
import { assumir } from "./acoes";

export function BotaoAssumir({ eventoId, funcaoId }: { eventoId: string; funcaoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await assumir(eventoId, funcaoId);
            setErro(r.erro ?? null);
            if (!r.erro) anunciar(r.celebracao);
          })
        }
        className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Assumindo…" : "Assumir esta data"}
      </button>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </>
  );
}
