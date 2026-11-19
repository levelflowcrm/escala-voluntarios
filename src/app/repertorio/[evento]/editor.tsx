"use client";

import { useState, useTransition } from "react";
import { formatarAtualizacao, LIMITES, type Musica } from "@/lib/repertorio";
import { salvarRepertorio } from "../acoes";

type Linha = { titulo: string; artista: string };
const vazia = (): Linha => ({ titulo: "", artista: "" });
const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

function Leitura({ rotulo, lista }: { rotulo: string; lista: Musica[] }) {
  if (lista.length === 0) return null;
  return (
    <section className="flex flex-col gap-1 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-sm font-medium text-neutral-500">{rotulo}</h2>
      {lista.map((m, i) => (
        <p key={i}>
          {lista.length > 1 && <span className="mr-2 text-neutral-400">{i + 1}.</span>}
          {m.titulo}
          {m.artista && <span className="text-neutral-500"> — {m.artista}</span>}
        </p>
      ))}
    </section>
  );
}

export function EditorRepertorio({
  evento,
  inicial,
  atualizadoEm,
  podeEditar,
}: {
  evento: string;
  inicial: Musica[];
  atualizadoEm: string | null;
  podeEditar: boolean;
}) {
  const doBloco = (b: Musica["bloco"]) => inicial.filter((m) => m.bloco === b).map(({ titulo, artista }) => ({ titulo, artista }));
  const [abertura, setAbertura] = useState<Linha[]>(() => {
    const l = doBloco("abertura");
    while (l.length < LIMITES.aberturaMin) l.push(vazia());
    return l;
  });
  const [temOfertorio, setTemOfertorio] = useState(() => doBloco("ofertorio").length > 0);
  const [ofertorio, setOfertorio] = useState<Linha>(() => doBloco("ofertorio")[0] ?? vazia());
  const [encerramento, setEncerramento] = useState<Linha>(() => doBloco("encerramento")[0] ?? vazia());
  const [erro, setErro] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  if (!podeEditar) {
    if (inicial.length === 0) return null;
    return (
      <>
        <Leitura rotulo="Abertura" lista={inicial.filter((m) => m.bloco === "abertura")} />
        <Leitura rotulo="Ofertório" lista={inicial.filter((m) => m.bloco === "ofertorio")} />
        <Leitura rotulo="Encerramento" lista={inicial.filter((m) => m.bloco === "encerramento")} />
      </>
    );
  }

  const mudar = (i: number, k: keyof Linha, v: string) => setAbertura((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  function salvar() {
    const musicas: Musica[] = [
      ...abertura.map((l) => ({ bloco: "abertura" as const, ...l })),
      ...(temOfertorio ? [{ bloco: "ofertorio" as const, ...ofertorio }] : []),
      { bloco: "encerramento" as const, ...encerramento },
    ];
    setErro(null);
    iniciar(async () => {
      const r = await salvarRepertorio(evento, musicas);
      if (r.erro) setErro(r.erro);
      else setSalvoEm(r.atualizadoEm ?? null);
    });
  }

  const linha = (l: Linha, aoMudar: (k: keyof Linha, v: string) => void, rotulo: string) => (
    <div className="flex flex-col gap-2">
      <input className={campo} placeholder={`${rotulo} — título da música`} maxLength={120} value={l.titulo} onChange={(e) => aoMudar("titulo", e.target.value)} />
      <input className={campo} placeholder="Artista ou ministério (opcional)" maxLength={120} value={l.artista} onChange={(e) => aoMudar("artista", e.target.value)} />
    </div>
  );

  return (
    <>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="font-medium">Abertura <span className="text-sm font-normal text-neutral-500">(de {LIMITES.aberturaMin} a {LIMITES.aberturaMax})</span></h2>
        {abertura.map((l, i) => (
          <div key={i} className="flex flex-col gap-1">
            {linha(l, (k, v) => mudar(i, k, v), `${i + 1}`)}
            {abertura.length > LIMITES.aberturaMin && i === abertura.length - 1 && (
              <button onClick={() => setAbertura((x) => x.slice(0, -1))} className="self-end text-sm text-red-600 underline">Remover esta</button>
            )}
          </div>
        ))}
        {abertura.length < LIMITES.aberturaMax && (
          <button onClick={() => setAbertura((x) => [...x, vazia()])} className="h-10 rounded-lg border border-dashed border-neutral-400 text-sm">+ Adicionar música de abertura</button>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={temOfertorio} onChange={(e) => setTemOfertorio(e.target.checked)} />
          <span className="font-medium">Tem música no ofertório <span className="text-sm font-normal text-neutral-500">(opcional)</span></span>
        </label>
        {temOfertorio && linha(ofertorio, (k, v) => setOfertorio((o) => ({ ...o, [k]: v })), "Ofertório")}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="font-medium">Encerramento</h2>
        {linha(encerramento, (k, v) => setEncerramento((o) => ({ ...o, [k]: v })), "Encerramento")}
      </section>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {salvoEm && !erro && <p className="text-sm text-emerald-700 dark:text-emerald-400">Salvo. A Projeção foi avisada. Atualizado em {formatarAtualizacao(salvoEm)}.</p>}
      <button onClick={salvar} disabled={ocupado} className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60">
        {ocupado ? "Salvando…" : atualizadoEm || salvoEm ? "Atualizar repertório" : "Enviar repertório"}
      </button>
      <p className="text-xs text-neutral-500">Cada alteração guarda o horário e avisa a Projeção por WhatsApp. Se nada mudou, ninguém é avisado de novo.</p>
    </>
  );
}
