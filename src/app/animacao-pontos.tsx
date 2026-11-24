"use client";

import { useEffect, useState } from "react";
import type { Celebracao } from "@/lib/celebracao";
import { buscarCelebracaoDeCulto } from "./acoes";

const EVENTO = "celebracao-pontos";

/** Pede para mostrar a animação (chamado depois de uma ação do próprio voluntário). */
export function anunciar(c: Celebracao | undefined | null) {
  if (c && typeof window !== "undefined") window.dispatchEvent(new CustomEvent<Celebracao>(EVENTO, { detail: c }));
}

const CONFETES = Array.from({ length: 16 }, (_, i) => ({
  esquerda: 6 + ((i * 37) % 88),
  atraso: (i % 6) * 0.08,
  cor: ["#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#60a5fa"][i % 5],
  giro: (i % 2 ? 1 : -1) * (120 + i * 17),
}));

/** Cartão que aparece por alguns segundos com a conquista (ou o acolhimento) do voluntário. Fica no layout. */
export function PainelCelebracao() {
  const [atual, setAtual] = useState<(Celebracao & { id: number }) | null>(null);

  useEffect(() => {
    const ao = (e: Event) => setAtual({ ...(e as CustomEvent<Celebracao>).detail, id: Date.now() });
    window.addEventListener(EVENTO, ao);
    return () => window.removeEventListener(EVENTO, ao);
  }, []);

  // Uma vez por sessão: se serviu desde a última visita, entrega o "missão cumprida"
  useEffect(() => {
    try {
      if (sessionStorage.getItem("cel-culto")) return;
      sessionStorage.setItem("cel-culto", "1");
    } catch {
      // sem sessionStorage: segue, o banco garante que não repete
    }
    buscarCelebracaoDeCulto().then((r) => anunciar(r.celebracao)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!atual) return;
    const t = setTimeout(() => setAtual(null), 6000);
    return () => clearTimeout(t);
  }, [atual]);

  if (!atual) return null;
  const ganho = atual.tom === "ganho";
  return (
    <div
      key={atual.id}
      role="status"
      aria-live="polite"
      onClick={() => setAtual(null)}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <div
        className={`cel-entra relative w-full max-w-sm overflow-hidden rounded-2xl p-4 text-white shadow-xl ${
          ganho ? "bg-gradient-to-br from-violet-600 to-fuchsia-600" : "bg-gradient-to-br from-slate-600 to-violet-800"
        }`}
      >
        {ganho &&
          CONFETES.map((c, i) => (
            <span
              key={i}
              aria-hidden
              className="cel-confete pointer-events-none absolute top-0 h-2 w-1.5 rounded-sm opacity-80"
              style={{ left: `${c.esquerda}%`, background: c.cor, animationDelay: `${c.atraso}s`, ["--giro" as string]: `${c.giro}deg` }}
            />
          ))}
        <div className="relative z-10 flex items-start gap-3">
          <span className="text-3xl" aria-hidden>
            {atual.emoji}
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-semibold leading-tight">{atual.titulo}</p>
            <p className="text-sm text-white/90">{atual.texto}</p>
            <p className="text-xs text-white/75">{atual.nivel}</p>
          </div>
          {atual.pontos !== null && (
            <span className="ml-auto shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-sm font-bold">
              {atual.pontos > 0 ? `+${atual.pontos}` : `−${Math.abs(atual.pontos)}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
