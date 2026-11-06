"use client";

import { useState, useTransition } from "react";
import { responder } from "./acoes";

export function Resposta({ escalaId, status }: { escalaId: string; status: string }) {
  const [pendente, iniciar] = useTransition();
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const enviar = (resposta: "confirmado" | "recusado") =>
    iniciar(async () => {
      const r = await responder(escalaId, resposta, resposta === "recusado" ? motivo : undefined);
      setErro(r.erro);
      if (!r.erro) setPedindoMotivo(false);
    });

  if (pedindoMotivo) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <input
          autoFocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (opcional): viagem, trabalho..."
          className="h-11 rounded-xl border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
        />
        <div className="flex gap-2">
          <button
            disabled={pendente}
            onClick={() => enviar("recusado")}
            className="h-11 flex-1 rounded-xl bg-red-600 font-medium text-white disabled:opacity-50"
          >
            {pendente ? "Enviando..." : "Avisar que não posso"}
          </button>
          <button onClick={() => setPedindoMotivo(false)} className="h-11 rounded-xl px-4 text-neutral-500">
            Voltar
          </button>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex gap-2">
        {status !== "confirmado" && (
          <button
            disabled={pendente}
            onClick={() => enviar("confirmado")}
            className="h-11 flex-1 rounded-xl bg-emerald-600 font-medium text-white disabled:opacity-50"
          >
            {pendente ? "Enviando..." : status === "recusado" ? "Posso sim" : "Confirmar"}
          </button>
        )}
        {status !== "recusado" && (
          <button
            disabled={pendente}
            onClick={() => setPedindoMotivo(true)}
            className="h-11 flex-1 rounded-xl border border-neutral-300 font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            Não posso
          </button>
        )}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
