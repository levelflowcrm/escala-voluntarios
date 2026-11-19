"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fmtDataHora } from "@/lib/datas";
import { enviar, marcar } from "./acoes";

export type Sugestao = {
  id: string;
  texto: string;
  status: "nova" | "vista" | "aplicada";
  criadoEm: string;
  ministerio: string;
  autor: string;
  recebida: boolean; // true quando chegou para mim como coordenador
};

const STATUS = {
  nova: { texto: "Nova", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  vista: { texto: "Vista", classe: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  aplicada: { texto: "Aplicada", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};
const campo = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

function Formulario({ ministerios }: { ministerios: { id: string; nome: string }[] }) {
  const [min, setMin] = useState(ministerios[0].id);
  const [texto, setTexto] = useState("");
  const [anonima, setAnonima] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <h2 className="font-medium">Tem uma ideia ou um ajuste?</h2>
      {ministerios.length > 1 && (
        <select className={`${campo} h-11`} value={min} onChange={(e) => setMin(e.target.value)}>
          {ministerios.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      )}
      <textarea className={`${campo} py-2`} rows={4} maxLength={1000} placeholder="Conte para o facilitador" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} className="h-4 w-4" />
        Enviar sem me identificar
      </label>
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await enviar(min, texto, anonima);
            if (r.erro) setMsg({ ok: false, texto: r.erro });
            else {
              setTexto("");
              setMsg({ ok: true, texto: anonima ? "Enviada. Quem recebe não vê seu nome ✓" : "Enviada ✓" });
            }
          })
        }
        className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Enviar sugestão"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.texto}</p>}
    </section>
  );
}

function Cartao({ s }: { s: Sugestao }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const b = STATUS[s.status];
  const botao = (status: "vista" | "aplicada", texto: string) => (
    <button
      disabled={pendente}
      onClick={() => iniciar(async () => setErro((await marcar(s.id, status)).erro))}
      className="h-9 rounded-lg border border-neutral-300 px-3 text-sm disabled:opacity-60 dark:border-neutral-700"
    >
      {texto}
    </button>
  );
  return (
    <article className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-line">{s.texto}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${b.classe}`}>{b.texto}</span>
      </div>
      <p className="text-xs text-neutral-500">
        {s.ministerio}{s.recebida && s.autor && ` · ${s.autor}`} · {fmtDataHora.format(new Date(s.criadoEm))}
      </p>
      {s.recebida && s.status !== "aplicada" && (
        <div className="mt-1 flex gap-2">
          {s.status === "nova" && botao("vista", "Marcar como vista")}
          {botao("aplicada", "Aplicada")}
        </div>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </article>
  );
}

export function TelaSugestoes({ ministerios, sugestoes }: { ministerios: { id: string; nome: string }[]; sugestoes: Sugestao[] }) {
  const recebidas = sugestoes.filter((s) => s.recebida);
  const minhas = sugestoes.filter((s) => !s.recebida);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Sugestões</h1>
      {ministerios.length > 0 ? <Formulario ministerios={ministerios} /> : <p className="text-neutral-500">Você ainda não está em nenhum ministério.</p>}
      {recebidas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Recebidas do time</h2>
          {recebidas.map((s) => <Cartao key={s.id} s={s} />)}
        </section>
      )}
      {minhas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Minhas sugestões</h2>
          {minhas.map((s) => <Cartao key={s.id} s={s} />)}
        </section>
      )}
    </main>
  );
}
