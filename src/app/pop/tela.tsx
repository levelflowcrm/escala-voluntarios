"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fmtDataHora } from "@/lib/datas";
import { POP_MAX_TEXTO } from "@/lib/pop";
import { salvarPop } from "./acoes";

export type PopDoTime = {
  ministerioId: string;
  nome: string;
  conteudo: string;
  link: string;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  podeEditar: boolean;
};

const campo = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

function Leitura({ t }: { t: PopDoTime }) {
  if (!t.conteudo && !t.link) {
    return <p className="text-neutral-500">O facilitador ainda não cadastrou o POP deste time.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {t.link && (
        <a
          href={t.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center rounded-xl bg-violet-600 font-medium text-white"
        >
          Abrir documento do POP
        </a>
      )}
      {t.conteudo && <p className="whitespace-pre-line break-words">{t.conteudo}</p>}
      {t.atualizadoEm && (
        <p className="text-xs text-neutral-500">
          Atualizado em {fmtDataHora.format(new Date(t.atualizadoEm))}
          {t.atualizadoPor && ` por ${t.atualizadoPor}`}
        </p>
      )}
    </div>
  );
}

function Edicao({ t, aoFechar }: { t: PopDoTime; aoFechar: () => void }) {
  const [conteudo, setConteudo] = useState(t.conteudo);
  const [link, setLink] = useState(t.link);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-neutral-500" htmlFor={`link-${t.ministerioId}`}>Link do documento (opcional)</label>
      <input
        id={`link-${t.ministerioId}`}
        className={`${campo} h-11`}
        inputMode="url"
        placeholder="https://drive.google.com/…"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <label className="text-sm text-neutral-500" htmlFor={`texto-${t.ministerioId}`}>Texto do POP</label>
      <textarea
        id={`texto-${t.ministerioId}`}
        className={`${campo} py-2`}
        rows={14}
        maxLength={POP_MAX_TEXTO}
        placeholder={"Passo a passo do time. Ex.:\n1. Chegar 40 min antes\n2. Ligar os equipamentos\n3. ..."}
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
      />
      <p className="text-xs text-neutral-500">Deixe texto e link vazios para remover o POP.</p>
      <div className="flex gap-2">
        <button
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarPop(t.ministerioId, conteudo, link);
              setErro(r.erro);
              if (!r.erro) aoFechar();
            })
          }
          className="h-11 flex-1 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar POP"}
        </button>
        <button disabled={pendente} onClick={aoFechar} className="h-11 rounded-xl border border-neutral-300 px-4 dark:border-neutral-700">
          Cancelar
        </button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

function Cartao({ t }: { t: PopDoTime }) {
  const [editando, setEditando] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{t.nome}</h2>
        {t.podeEditar && !editando && (
          <button onClick={() => setEditando(true)} className="h-9 rounded-lg border border-neutral-300 px-3 text-sm dark:border-neutral-700">
            {t.conteudo || t.link ? "Editar" : "Cadastrar POP"}
          </button>
        )}
      </div>
      {editando ? <Edicao t={t} aoFechar={() => setEditando(false)} /> : <Leitura t={t} />}
    </section>
  );
}

export function TelaPop({ times }: { times: PopDoTime[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">POP do time</h1>
      <p className="text-sm text-neutral-500">Procedimento Operacional Padrão: como o time trabalha, passo a passo.</p>
      {times.length === 0 && <p className="text-neutral-500">Você ainda não está em nenhum ministério.</p>}
      {times.map((t) => <Cartao key={t.ministerioId} t={t} />)}
    </main>
  );
}
