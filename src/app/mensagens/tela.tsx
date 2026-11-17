"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fmtDataHora } from "@/lib/datas";
import { enviarMensagem, marcarMensagem } from "./acoes";

export type Mensagem = {
  id: string;
  tipo: "erro" | "sugestao";
  texto: string;
  pagina: string | null;
  status: "nova" | "vista" | "resolvida";
  criadoEm: string;
  autor: string;
  minha: boolean;
};

const STATUS = {
  nova: { texto: "Nova", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  vista: { texto: "Vista", classe: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  resolvida: { texto: "Resolvida", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};
const TIPO = { erro: "🐞 Erro", sugestao: "💡 Sugestão" };
const campo = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

function Formulario() {
  const [tipo, setTipo] = useState<"erro" | "sugestao">("erro");
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const opcao = (t: "erro" | "sugestao") => (
    <button
      type="button"
      onClick={() => setTipo(t)}
      aria-pressed={tipo === t}
      className={`h-11 flex-1 rounded-xl border text-sm font-medium ${
        tipo === t ? "border-violet-600 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200" : "border-neutral-300 dark:border-neutral-700"
      }`}
    >
      {TIPO[t]}
    </button>
  );
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <h2 className="font-medium">O que você quer contar?</h2>
      <div className="flex gap-2">{opcao("erro")}{opcao("sugestao")}</div>
      <textarea
        className={`${campo} py-2`}
        rows={5}
        maxLength={2000}
        placeholder={tipo === "erro" ? "O que aconteceu? O que você estava tentando fazer?" : "Qual ideia ou melhoria você sugere?"}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      {tipo === "erro" && (
        <input className={`${campo} h-11`} maxLength={200} placeholder="Em qual tela? (opcional)" value={pagina} onChange={(e) => setPagina(e.target.value)} />
      )}
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await enviarMensagem(tipo, texto, tipo === "erro" ? pagina : "");
            if (r.erro) setMsg({ ok: false, texto: r.erro });
            else {
              setTexto("");
              setPagina("");
              setMsg({ ok: true, texto: "Enviada. Obrigado por ajudar a melhorar o app 💜" });
            }
          })
        }
        className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Enviar"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.texto}</p>}
      <p className="text-xs text-neutral-500">Quem recebe é o administrador do app. Seu nome vai junto, para poderem falar com você se precisarem.</p>
    </section>
  );
}

function Cartao({ m, recebida }: { m: Mensagem; recebida: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const b = STATUS[m.status];
  const botao = (status: "vista" | "resolvida", texto: string) => (
    <button
      disabled={pendente}
      onClick={() => iniciar(async () => setErro((await marcarMensagem(m.id, status)).erro))}
      className="h-9 rounded-lg border border-neutral-300 px-3 text-sm disabled:opacity-60 dark:border-neutral-700"
    >
      {texto}
    </button>
  );
  return (
    <article className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-line">{m.texto}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${b.classe}`}>{b.texto}</span>
      </div>
      <p className="text-xs text-neutral-500">
        {TIPO[m.tipo]}
        {recebida && m.autor && ` · ${m.autor}`}
        {m.pagina && ` · tela: ${m.pagina}`} · {fmtDataHora.format(new Date(m.criadoEm))}
      </p>
      {recebida && m.status !== "resolvida" && (
        <div className="mt-1 flex gap-2">
          {m.status === "nova" && botao("vista", "Marcar como vista")}
          {botao("resolvida", "Resolvida")}
        </div>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </article>
  );
}

export function TelaMensagens({ master, mensagens }: { master: boolean; mensagens: Mensagem[] }) {
  const recebidas = master ? mensagens : [];
  const minhas = mensagens.filter((m) => m.minha);
  const novas = recebidas.filter((m) => m.status === "nova").length;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Erros e sugestões do app</h1>
      <Formulario />
      {recebidas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Recebidas{novas > 0 && ` · ${novas} ${novas === 1 ? "nova" : "novas"}`}</h2>
          {recebidas.map((m) => <Cartao key={m.id} m={m} recebida />)}
        </section>
      )}
      {minhas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">O que eu enviei</h2>
          {minhas.map((m) => <Cartao key={m.id} m={m} recebida={false} />)}
        </section>
      )}
    </main>
  );
}
