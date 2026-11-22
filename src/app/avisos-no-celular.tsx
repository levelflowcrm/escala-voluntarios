"use client";

import { useEffect, useState } from "react";

type Estado = "oculto" | "pronto" | "ativando" | "negado" | "instalar";

const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function chaveParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const preenchida = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(preenchida);
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

async function enviarAoServidor(sub: PushSubscription) {
  const j = sub.toJSON();
  const r = await fetch("/api/push/assinar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }),
  });
  return r.ok;
}

/** Limpa o número vermelho do ícone sempre que o app é aberto ou volta para a frente. */
function limparNumero(reg: ServiceWorkerRegistration | undefined) {
  const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
  nav.clearAppBadge?.().catch(() => {});
  reg?.active?.postMessage("limpar-contagem");
}

/** Cartão para ativar os avisos no celular (push). Só aparece quando falta ativar e o aparelho suporta. */
export function AvisosNoCelular() {
  const [estado, setEstado] = useState<Estado>("oculto");
  const [reg, setReg] = useState<ServiceWorkerRegistration>();

  useEffect(() => {
    if (!CHAVE_PUBLICA || !("serviceWorker" in navigator)) return;
    let vivo = true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const suporta = "PushManager" in window && "Notification" in window;

    (async () => {
      const r = await navigator.serviceWorker.register("/sw.js");
      if (!vivo) return;
      setReg(r);
      limparNumero(r);
      if (!suporta) {
        setEstado(ios && !instalado ? "instalar" : "oculto");
        return;
      }
      if (Notification.permission === "denied") return setEstado("negado");
      const atual = await r.pushManager.getSubscription();
      if (atual && Notification.permission === "granted") {
        await enviarAoServidor(atual); // mantém o aparelho ligado a quem está logado agora
        return setEstado("oculto");
      }
      setEstado("pronto");
    })().catch(() => {});

    const aoVoltar = () => {
      if (document.visibilityState === "visible") navigator.serviceWorker.getRegistration().then(limparNumero);
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);

  async function ativar() {
    if (!reg || !CHAVE_PUBLICA) return;
    setEstado("ativando");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") return setEstado(permissao === "denied" ? "negado" : "pronto");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(CHAVE_PUBLICA) }));
      setEstado((await enviarAoServidor(sub)) ? "oculto" : "pronto");
    } catch {
      setEstado("pronto");
    }
  }

  if (estado === "oculto") return null;
  const caixa = "rounded-xl bg-violet-50 px-4 py-3 text-sm dark:bg-violet-950/40";
  if (estado === "instalar")
    return (
      <p className={caixa}>
        Para receber avisos no iPhone, instale o app: toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
      </p>
    );
  if (estado === "negado")
    return <p className={caixa}>Os avisos estão bloqueados neste aparelho. Para receber, libere as notificações do Mais Conectados nas configurações do celular.</p>;
  return (
    <div className={`${caixa} flex items-center justify-between gap-3`}>
      <span>Receba os avisos de escala direto no celular.</span>
      <button onClick={ativar} disabled={estado === "ativando"} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 font-medium text-white disabled:opacity-60">
        {estado === "ativando" ? "Ativando…" : "Ativar avisos"}
      </button>
    </div>
  );
}
