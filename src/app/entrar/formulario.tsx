"use client";

import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";

export function FormularioEntrar() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "enviado" | "erro">("livre");
  const [mensagemErro, setMensagemErro] = useState("");
  const supabase = criarClienteNavegador();
  const voltarPara = () => `${window.location.origin}/auth/callback`;

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: voltarPara() },
    });
    if (error) {
      setMensagemErro(
        error.status === 429
          ? "Muitos pedidos seguidos. Espere alguns minutos e tente de novo."
          : "Não foi possível enviar o link. Confira o e-mail e tente de novo.",
      );
      setEstado("erro");
    } else {
      setEstado("enviado");
    }
  }

  async function entrarComGoogle() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: voltarPara() } });
  }

  if (estado === "enviado") {
    return (
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="font-medium">Confira seu e-mail 📬</p>
        <p className="mt-1 text-sm text-neutral-500">
          Mandamos um link de acesso para <strong>{email}</strong>. Abra no mesmo celular. Se não chegar em 2 minutos,
          olhe o spam.
        </p>
        <button className="mt-3 text-sm text-violet-600 underline" onClick={() => setEstado("livre")}>
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={entrarComGoogle}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-neutral-300 font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
        </svg>
        Entrar com Google
      </button>

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        ou receba um link por e-mail
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <form onSubmit={enviarLink} className="flex flex-col gap-3">
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 rounded-xl border border-neutral-300 bg-transparent px-4 outline-none focus:border-violet-500 dark:border-neutral-700"
        />
        <button
          disabled={estado === "enviando"}
          className="h-12 rounded-xl bg-violet-600 font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {estado === "enviando" ? "Enviando..." : "Receber link de acesso"}
        </button>
        {estado === "erro" && <p className="text-sm text-red-600">{mensagemErro}</p>}
      </form>
    </div>
  );
}
