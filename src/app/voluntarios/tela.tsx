"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { salvarEmail, type NivelHab } from "./acoes";
import { Habilidades, type AreaFuncoes } from "./habilidades";
import { NovoVoluntario } from "./novo";

export type Voluntario = { id: string; nome: string; email: string; conectado: boolean };

function Linha({ v, areas, habilidades }: { v: Voluntario; areas: AreaFuncoes[]; habilidades: Record<string, NivelHab> }) {
  const [aberto, setAberto] = useState(false);
  const resumo = areas
    .map((a) => ({ nome: a.nome, n: a.funcoes.filter((f) => habilidades[f.id]).length }))
    .filter((a) => a.n > 0);
  const [email, setEmail] = useState(v.email);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const mudou = email.trim().toLowerCase() !== v.email;
  const situacao = v.conectado ? "Já entrou" : v.email ? "Aguardando 1º acesso" : "Sem e-mail";
  const cor = v.conectado
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    : v.email
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-3 dark:border-neutral-700">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{v.nome}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${cor}`}>{situacao}</span>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          placeholder="e-mail do Google"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSalvo(false);
          }}
          className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
        />
        <button
          disabled={!mudou || pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarEmail(v.id, email);
              setErro(r.erro);
              setSalvo(!r.erro);
            })
          }
          className="h-11 rounded-lg bg-violet-600 px-4 font-medium text-white disabled:opacity-40"
        >
          {pendente ? "…" : "Salvar"}
        </button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {salvo && !erro && <p className="text-sm text-emerald-700 dark:text-emerald-400">Salvo ✓</p>}
      <button onClick={() => setAberto(!aberto)} className="flex items-center justify-between text-left text-sm text-violet-700 dark:text-violet-300">
        <span>
          Habilidades
          {resumo.length > 0 && <span className="text-neutral-500"> · {resumo.map((a) => `${a.nome} (${a.n})`).join(" · ")}</span>}
        </span>
        <span>{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && <Habilidades pessoaId={v.id} areas={areas} inicial={habilidades} />}
    </article>
  );
}

export function TelaVoluntarios({
  voluntarios,
  areas,
  habilidades,
}: {
  voluntarios: Voluntario[];
  areas: AreaFuncoes[];
  habilidades: Record<string, Record<string, NivelHab>>;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = voluntarios.filter((v) => v.nome.toLowerCase().includes(busca.toLowerCase()));
  const conectados = voluntarios.filter((v) => v.conectado).length;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Voluntários</h1>
      <p className="text-sm text-neutral-500">
        Cadastre o e-mail Google e as habilidades de cada voluntário (em quais áreas e funções ele pode servir). No primeiro login com esse e-mail, a pessoa é vinculada à escala
        automaticamente. {conectados} de {voluntarios.length} já entraram.
      </p>
      <NovoVoluntario areas={areas} />
      <input
        placeholder="Buscar pelo nome"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="h-11 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
      />
      {filtrados.map((v) => (
        <Linha key={v.id} v={v} areas={areas} habilidades={habilidades[v.id] ?? {}} />
      ))}
      {filtrados.length === 0 && <p className="text-neutral-500">Ninguém encontrado.</p>}
    </main>
  );
}
