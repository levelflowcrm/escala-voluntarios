"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const FUSO = "America/Sao_Paulo";
const CORES = ["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

function horaEmBrasilia(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
}

/**
 * Surpresa de aniversário: a partir das 9h (horário de Brasília), no dia do aniversário, a pessoa vê a própria foto
 * com uma chuva de confetes. Aparece uma vez por dia (lembra no aparelho); respeita "reduzir movimento".
 */
export function Parabens({ nome, dia, foto, igreja }: { nome: string; dia: string; foto: string | null; igreja: string }) {
  const [aberto, setAberto] = useState(false);
  const chave = `parabens:${dia}`;

  useEffect(() => {
    const jaViu = () => {
      try { return localStorage.getItem(chave) === "1"; } catch { return false; }
    };
    if (jaViu()) return;
    const conferir = () => {
      if (horaEmBrasilia() >= 9) {
        setAberto(true);
        return true;
      }
      return false;
    };
    if (conferir()) return;
    const t = setInterval(() => { if (conferir()) clearInterval(t); }, 60_000); // aberto antes das 9h: espera dar a hora
    return () => clearInterval(t);
  }, [chave]);

  function fechar() {
    try { localStorage.setItem(chave, "1"); } catch { /* sem armazenamento: aparece de novo, sem problema */ }
    setAberto(false);
  }

  if (!aberto) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={`Feliz aniversário, ${nome}`} className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-violet-950/90 p-6">
      <style>{`
        @keyframes mc-cair { 0% { transform: translateY(-12vh) rotate(0deg); opacity: 1 } 100% { transform: translateY(110vh) rotate(720deg); opacity: .9 } }
        @keyframes mc-subir { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes mc-pulsar { 0%,100% { box-shadow: 0 0 0 0 rgba(236,72,153,.55) } 50% { box-shadow: 0 0 0 22px rgba(236,72,153,0) } }
        .mc-confete { position: absolute; top: 0; width: 10px; height: 16px; border-radius: 2px; animation: mc-cair linear infinite }
        .mc-cartao { animation: mc-subir .8s ease-out both }
        .mc-foto { animation: mc-pulsar 2s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .mc-confete, .mc-foto { animation: none } .mc-confete { display: none } .mc-cartao { animation: none } }
      `}</style>
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="mc-confete"
          style={{ left: `${(i * 29) % 100}%`, background: CORES[i % CORES.length], animationDuration: `${3 + (i % 5) * 0.7}s`, animationDelay: `${(i % 9) * 0.35}s` }}
        />
      ))}
      <div className="mc-cartao relative flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-neutral-900">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={`Foto de ${nome}`} className="mc-foto h-40 w-40 rounded-full object-cover ring-4 ring-pink-400" />
        ) : (
          <div aria-hidden className="mc-foto flex h-40 w-40 items-center justify-center rounded-full bg-violet-100 text-6xl font-semibold text-violet-700 ring-4 ring-pink-400">
            {nome.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="text-3xl font-bold">Feliz aniversário, {nome}! 🎂</h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          A {igreja} agradece a Deus pela sua vida e por você servir com a gente. Que o seu novo ano seja cheio de graça e alegria. 🎉
        </p>
        <button onClick={fechar} className="h-12 w-full rounded-xl bg-violet-600 font-medium text-white">Amém, obrigado! 🙏</button>
        {!foto && (
          <Link href="/perfil" onClick={fechar} className="text-sm text-violet-700 underline dark:text-violet-300">
            Adicione a sua foto no perfil para aparecer aqui
          </Link>
        )}
      </div>
    </div>
  );
}
