"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Convite para instalar o app: botão no Android/Chrome, passo a passo no iPhone. Some se já estiver instalado. */
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [instalado, setInstalado] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const aoPedir = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const aoInstalar = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", aoPedir);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPedir);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  if (instalado || (!evento && !ios)) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white/10 p-4 text-sm ring-1 ring-white/15 backdrop-blur">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="6" y="2" width="12" height="20" rx="2.5" />
          <path d="M12 8v6m-3-3 3 3 3-3" />
        </svg>
        <div>
          <h2 className="text-base font-semibold">Instale o app no seu celular</h2>
          {evento ? (
            <p className="text-blue-100/75">Fica na tela inicial, abre em tela cheia e é mais rápido de usar.</p>
          ) : (
            <p className="text-blue-100/75">
              No Safari, toque em <strong>Compartilhar</strong> (o quadrado com a seta) e depois em <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
        </div>
      </div>
      {evento && (
        <button
          type="button"
          onClick={async () => {
            await evento.prompt();
            setEvento(null);
          }}
          className="rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white hover:bg-orange-400"
        >
          Instalar app
        </button>
      )}
    </section>
  );
}
