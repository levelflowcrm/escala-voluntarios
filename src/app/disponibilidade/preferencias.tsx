"use client";

import { useState, useTransition } from "react";
import { salvarPreferencias } from "./acoes";

/** Preferências: limite de serviços por mês e recado ao facilitador. */
export function Preferencias({ limite, observacao, pessoaId, sujeito }: { limite: number | null; observacao: string; pessoaId?: string; sujeito?: string }) {
  const [valor, setValor] = useState(limite === null ? "" : String(limite));
  const [nota, setNota] = useState(observacao);
  const [ocupado, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const campo = "h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-medium text-neutral-500">{sujeito ? `Preferências de ${sujeito}` : "Minhas preferências"}</h2>
      <label className="flex flex-col gap-1 text-sm">
        {sujeito ? "Máximo de vezes por mês" : "Quantas vezes por mês, no máximo, você prefere servir?"}
        <select className={campo} value={valor} onChange={(e) => setValor(e.target.value)}>
          <option value="">Sem limite</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n === 1 ? "1 vez por mês" : `${n} vezes por mês`}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {sujeito ? "Recado para o facilitador" : "Recado para o facilitador (opcional)"}
        <textarea className={`${campo} h-20 py-2`} maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: prefiro cultos de domingo" />
      </label>
      <p className="text-xs text-neutral-500">
        A sugestão automática respeita o limite. O facilitador ainda pode te escalar manualmente se precisar.
      </p>
      <button
        disabled={ocupado}
        onClick={() =>
          iniciar(async () => {
            const r = await salvarPreferencias(valor === "" ? null : Number(valor), nota, pessoaId);
            setMsg(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Preferências salvas." });
          })
        }
        className="h-11 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-60"
      >
        {ocupado ? "Salvando…" : "Salvar preferências"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600"}`}>{msg.texto}</p>}
    </section>
  );
}
