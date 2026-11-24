"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { salvarCelular, salvarEmail, type NivelHab } from "./acoes";
import { DisponibilidadeDoVoluntario } from "./disponibilidade";
import { Habilidades, type AreaFuncoes } from "./habilidades";
import { NovoVoluntario } from "./novo";

export type Voluntario = { id: string; nome: string; email: string; conectado: boolean; celular: string };

function Linha({ v, areas, habilidades }: { v: Voluntario; areas: AreaFuncoes[]; habilidades: Record<string, NivelHab> }) {
  const [aberto, setAberto] = useState(false);
  const [abertoDisp, setAbertoDisp] = useState(false);
  const resumo = areas
    .map((a) => ({ nome: a.nome, n: a.funcoes.filter((f) => habilidades[f.id]).length }))
    .filter((a) => a.n > 0);
  const [email, setEmail] = useState(v.email);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [celular, setCelular] = useState(v.celular);
  const [erroCel, setErroCel] = useState<string | null>(null);
  const [salvoCel, setSalvoCel] = useState(false);
  const [pendenteCel, iniciarCel] = useTransition();
  const mudouCel = celular.trim() !== v.celular;
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
      <div className="flex gap-2">
        <input
          type="tel"
          inputMode="tel"
          placeholder="celular com DDD (avisos por WhatsApp)"
          value={celular}
          onChange={(e) => {
            setCelular(e.target.value);
            setSalvoCel(false);
          }}
          className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
        />
        <button
          disabled={!mudouCel || pendenteCel}
          onClick={() =>
            iniciarCel(async () => {
              const r = await salvarCelular(v.id, celular);
              setErroCel(r.erro);
              setSalvoCel(!r.erro);
            })
          }
          className="h-11 rounded-lg bg-violet-600 px-4 font-medium text-white disabled:opacity-40"
        >
          {pendenteCel ? "…" : "Salvar"}
        </button>
      </div>
      {erroCel && <p className="text-sm text-red-600">{erroCel}</p>}
      {salvoCel && !erroCel && <p className="text-sm text-emerald-700 dark:text-emerald-400">Celular salvo ✓</p>}
      {!celular.trim() && !salvoCel && <p className="text-xs text-amber-700 dark:text-amber-400">Sem celular: não recebe avisos por WhatsApp.</p>}
      <button onClick={() => setAberto(!aberto)} className="flex items-center justify-between text-left text-sm text-violet-700 dark:text-violet-300">
        <span>
          Habilidades
          {resumo.length > 0 && <span className="text-neutral-500"> · {resumo.map((a) => `${a.nome} (${a.n})`).join(" · ")}</span>}
        </span>
        <span>{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && <Habilidades pessoaId={v.id} areas={areas} inicial={habilidades} />}
      <button onClick={() => setAbertoDisp(!abertoDisp)} className="flex items-center justify-between text-left text-sm text-violet-700 dark:text-violet-300">
        <span>Disponibilidade (resumo) e próximas escalas</span>
        <span>{abertoDisp ? "▲" : "▼"}</span>
      </button>
      {abertoDisp && <DisponibilidadeDoVoluntario pessoaId={v.id} nome={v.nome} />}
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
  const semCelular = voluntarios.filter((v) => !v.celular.trim()).length;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Voluntários</h1>
      <p className="text-sm text-neutral-500">
        Cadastre o e-mail Google e as habilidades de cada voluntário (em quais áreas e funções ele pode servir) e consulte o resumo da disponibilidade dele (quem altera é o próprio voluntário). No primeiro login com esse e-mail, a pessoa é vinculada à escala
        automaticamente. {conectados} de {voluntarios.length} já entraram.
      </p>
      {semCelular > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {semCelular} {semCelular === 1 ? "pessoa está" : "pessoas estão"} sem celular e não {semCelular === 1 ? "recebe" : "recebem"} avisos por WhatsApp.
        </p>
      )}
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
