"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { anunciar } from "../animacao-pontos";
import type { Celebracao } from "@/lib/celebracao";
import { abrirVaga, cancelarTroca, pedirTroca, responderTroca } from "./acoes";

/** Operação descrita por dados simples: funções não podem ser passadas de componente de servidor para cliente. */
export type Operacao =
  | { tipo: "abrirVaga"; escala: string }
  | { tipo: "pedirTroca"; escala: string; colega: string }
  | { tipo: "responderTroca"; troca: string; aceitar: boolean }
  | { tipo: "cancelarTroca"; troca: string };

function executar(o: Operacao): Promise<{ erro?: string; celebracao?: Celebracao }> {
  switch (o.tipo) {
    case "abrirVaga": return abrirVaga(o.escala);
    case "pedirTroca": return pedirTroca(o.escala, o.colega);
    case "responderTroca": return responderTroca(o.troca, o.aceitar);
    case "cancelarTroca": return cancelarTroca(o.troca);
  }
}

/** Botão genérico que roda uma ação de servidor e mostra o erro, se houver. */
export function BotaoAcao({
  rotulo,
  operacao,
  destaque = false,
  voltarPara,
  confirmar,
}: {
  rotulo: string;
  operacao: Operacao;
  destaque?: boolean;
  voltarPara?: string;
  confirmar?: string;
}) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={ocupado}
        onClick={() => {
          if (confirmar && !window.confirm(confirmar)) return;
          iniciar(async () => {
            const r = await executar(operacao);
            setErro(r.erro ?? null);
            if (!r.erro) anunciar(r.celebracao);
            if (!r.erro && voltarPara) router.push(voltarPara);
          });
        }}
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
