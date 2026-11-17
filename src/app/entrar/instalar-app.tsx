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
    <section className="flex flex-col gap-2 rounded-xl bg-violet-50 p-4 text-sm dark:bg-violet-950">
      <h2 className="font-medium">Instale o app no seu celular</h2>
      {evento ? (
        <>
          <p className="text-neutral-600 dark:text-neutral-300">Fica na tela inicial, abre em tela cheia e é mais rápido de usar.</p>
          <button
            type="button"
            onClick={async () => {
              await evento.prompt();
              setEvento(null);
            }}
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white"
          >
            Instalar app
          </button>
        </>
      ) : (
        <p className="text-neutral-600 dark:text-neutral-300">
          No Safari, toque em <strong>Compartilhar</strong> (o quadrado com a seta) e depois em <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
    </section>
  );
}
