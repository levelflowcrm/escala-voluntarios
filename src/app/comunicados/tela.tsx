"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fmtDataHora } from "@/lib/datas";
import { apagar, publicar } from "./acoes";

export type Comunicado = { id: string; titulo: string; texto: string; criadoEm: string; ministerio: string; autor: string };

const campo = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

function Formulario({ ministerios }: { ministerios: { id: string; nome: string }[] }) {
  const [min, setMin] = useState(ministerios[0].id);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <h2 className="font-medium">Novo comunicado</h2>
      {ministerios.length > 1 && (
        <select className={`${campo} h-11`} value={min} onChange={(e) => setMin(e.target.value)}>
          {ministerios.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      )}
      <input className={`${campo} h-11`} placeholder="Título" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <textarea className={`${campo} py-2`} rows={4} placeholder="Mensagem para o time" maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await publicar(min, titulo, texto);
            setErro(r.erro);
            if (!r.erro) {
              setTitulo("");
              setTexto("");
            }
          })
        }
        className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Publicando…" : "Publicar para o time"}
      </button>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </section>
  );
}

export function TelaComunicados({
  comunicados,
  ministerios,
}: {
  comunicados: Comunicado[];
  ministerios: { id: string; nome: string }[];
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Comunicados</h1>
      {ministerios.length > 0 && <Formulario ministerios={ministerios} />}
      {comunicados.length === 0 && <p className="text-neutral-500">Nenhum comunicado por enquanto.</p>}
      {comunicados.map((c) => (
        <article key={c.id} className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="font-medium">{c.titulo}</p>
          <p className="whitespace-pre-line">{c.texto}</p>
          <p className="text-xs text-neutral-500">
            {c.ministerio}{c.autor && ` · ${c.autor}`} · {fmtDataHora.format(new Date(c.criadoEm))}
          </p>
          {ministerios.some((m) => m.nome === c.ministerio) && (
            <button
              disabled={pendente}
              onClick={() => {
                if (!confirm("Apagar este comunicado?")) return;
                iniciar(async () => setErro((await apagar(c.id)).erro));
              }}
              className="self-start text-sm text-red-600 underline disabled:opacity-60"
            >
              Apagar
            </button>
          )}
        </article>
      ))}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </main>
  );
}
