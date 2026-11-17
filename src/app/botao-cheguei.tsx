"use client";

import { useState, useTransition } from "react";
import { situacaoChegada } from "@/lib/chegada";
import { registrarChegada } from "./acoes";

/** Pede a posição do celular uma única vez, com mensagens claras quando não dá. */
function pegarPosicao(): Promise<{ lat: number; lng: number; precisao: number | null } | { erro: string }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ erro: "Este aparelho não permite usar a localização." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null }),
      (e) =>
        resolve({
          erro:
            e.code === e.PERMISSION_DENIED
              ? "Para avisar que chegou, permita o acesso à localização do navegador. Só usamos para confirmar que você está na igreja."
              : "Não consegui pegar a sua localização. Vá para um lugar mais aberto (perto de uma janela ou porta) e tente de novo.",
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

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
            setErro(null);
            const pos = await pegarPosicao();
            if ("erro" in pos) {
              setErro(pos.erro);
              return;
            }
            const r = await registrarChegada(escalaId, pos.lat, pos.lng, pos.precisao);
            setErro(r.erro);
          })
        }
        className="h-12 rounded-xl bg-white font-semibold text-violet-700 disabled:opacity-50"
      >
        {pendente ? "Confirmando..." : "📍 Cheguei"}
      </button>
      <p className="text-xs text-white/70">Usamos sua localização só para confirmar que você está na igreja; ela não fica guardada.</p>
      {erro && <p className="text-sm text-red-200">{erro}</p>}
    </div>
  );
}
