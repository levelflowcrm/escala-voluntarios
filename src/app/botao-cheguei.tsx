"use client";

import { useState, useTransition } from "react";
import { situacaoChegada } from "@/lib/chegada";
import { registrarChegada } from "./acoes";

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Botão "Cheguei" do cartão do próximo evento; só aparece dentro da janela do dia. */
export function BotaoCheguei({ escalaId, inicio, chegouEm }: { escalaId: string; inicio: string; chegouEm: string | null }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (chegouEm) {
    return <p className="rounded-xl bg-white/15 px-3 py-2 text-sm font-medium">📍 Você chegou às {hora.format(new Date(chegouEm))} ✓</p>;
  }
  if (situacaoChegada(inicio) !== "aberta") return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await registrarChegada(escalaId);
            setErro(r.erro);
          })
        }
        className="h-12 rounded-xl bg-white font-semibold text-violet-700 disabled:opacity-50"
      >
        {pendente ? "Avisando..." : "📍 Cheguei"}
      </button>
      {erro && <p className="text-sm text-red-200">{erro}</p>}
    </div>
  );
}
