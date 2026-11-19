"use client";

import { useState, useTransition } from "react";
import { LINKS, type MusicaBiblioteca, TONS } from "@/lib/musicas";
import { formatarAtualizacao, LIMITES, type Modo, type Musica } from "@/lib/repertorio";
import { salvarRepertorio } from "../acoes";

type Linha = { titulo: string; artista: string; tom: string; musicaId: string | null };
const vazia = (): Linha => ({ titulo: "", artista: "", tom: "", musicaId: null });
const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

function Leitura({ rotulo, lista, biblioteca, veTom }: { rotulo: string; lista: Musica[]; biblioteca: Map<string, MusicaBiblioteca>; veTom: boolean }) {
  if (lista.length === 0) return null;
  return (
    <section className="flex flex-col gap-1 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-sm font-medium text-neutral-500">{rotulo}</h2>
      {lista.map((m, i) => (
        <div key={i} className="flex flex-col gap-1 py-1">
          <p>
            {lista.length > 1 && <span className="mr-2 text-neutral-400">{i + 1}.</span>}
            {m.titulo}
            {m.artista && <span className="text-neutral-500"> — {m.artista}</span>}
            {veTom && m.tom && <span className="ml-2 rounded-lg bg-pink-100 px-2 py-0.5 text-sm font-semibold text-pink-800 dark:bg-pink-950 dark:text-pink-300">{m.tom}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {LINKS.filter((l) => veTom && m.musicaId && biblioteca.get(m.musicaId)?.[l.campo]).map((l) => (
              <a key={l.campo} href={biblioteca.get(m.musicaId as string)?.[l.campo] as string} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 px-3 py-0.5 text-sm dark:border-neutral-700">
                {l.icone} {l.rotulo}
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function EditorRepertorio({
  evento,
  inicial,
  publicado,
  programadoPara,
  podeProgramar,
  podeEditar,
  veTom,
  biblioteca,
}: {
  evento: string;
  inicial: Musica[];
  publicado: boolean;
  programadoPara: string | null;
  podeProgramar: boolean;
  podeEditar: boolean;
  veTom: boolean;
  biblioteca: MusicaBiblioteca[];
}) {
  // Digitar/escolher um título da biblioteca preenche artista e tom padrão e vincula a música
  const aplicar = (l: Linha, k: keyof Linha, v: string): Linha => {
    if (k !== "titulo") return { ...l, [k]: v };
    const achada = biblioteca.find((m) => m.titulo.trim().toLowerCase() === v.trim().toLowerCase() && (!l.artista || (m.artista ?? "").toLowerCase() === l.artista.toLowerCase()))
      ?? biblioteca.find((m) => m.titulo.trim().toLowerCase() === v.trim().toLowerCase());
    return achada ? { titulo: achada.titulo, artista: achada.artista ?? "", tom: l.tom || achada.tom || "", musicaId: achada.id } : { ...l, titulo: v, musicaId: null };
  };
  const doBloco = (b: Musica["bloco"]): Linha[] => inicial.filter((m) => m.bloco === b).map(({ titulo, artista, tom, musicaId }) => ({ titulo, artista, tom, musicaId: musicaId ?? null }));
  const porId = new Map(biblioteca.map((m) => [m.id, m]));
  const [abertura, setAbertura] = useState<Linha[]>(() => {
    const l = doBloco("abertura");
    while (l.length < LIMITES.aberturaMin) l.push(vazia());
    return l;
  });
  const [temOfertorio, setTemOfertorio] = useState(() => doBloco("ofertorio").length > 0);
  const [ofertorio, setOfertorio] = useState<Linha>(() => doBloco("ofertorio")[0] ?? vazia());
  const [encerramento, setEncerramento] = useState<Linha>(() => doBloco("encerramento")[0] ?? vazia());
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [jaPublicado, setJaPublicado] = useState(publicado);
  const [ocupado, iniciar] = useTransition();

  if (!podeEditar) {
    if (inicial.length === 0) return null;
    return (
      <>
        <Leitura rotulo="Abertura" lista={inicial.filter((m) => m.bloco === "abertura")} biblioteca={porId} veTom={veTom} />
        <Leitura rotulo="Ofertório" lista={inicial.filter((m) => m.bloco === "ofertorio")} biblioteca={porId} veTom={veTom} />
        <Leitura rotulo="Encerramento" lista={inicial.filter((m) => m.bloco === "encerramento")} biblioteca={porId} veTom={veTom} />
      </>
    );
  }

  const mudar = (i: number, k: keyof Linha, v: string) => setAbertura((l) => l.map((x, j) => (j === i ? aplicar(x, k, v) : x)));

  function salvar(modo: Modo) {
    const musicas: Musica[] = [
      ...abertura.map((l) => ({ bloco: "abertura" as const, ...l })),
      ...(temOfertorio ? [{ bloco: "ofertorio" as const, ...ofertorio }] : []),
      { bloco: "encerramento" as const, ...encerramento },
    ];
    setErro(null);
    iniciar(async () => {
      const r = await salvarRepertorio(evento, musicas, modo);
      if (r.erro) setErro(r.erro);
      else {
        if (modo === "agora") setJaPublicado(true);
        setAviso(
          modo === "agora"
            ? `Salvo. Louvor e Projeção escalados foram avisados. Atualizado em ${formatarAtualizacao(r.atualizadoEm ?? new Date())}.`
            : modo === "programar"
              ? "Programado: o aviso sai às 7h30 do dia do culto. Até lá só você vê o repertório."
              : "Rascunho salvo. Ninguém foi avisado e só você vê.",
        );
      }
    });
  }

  const linha = (l: Linha, aoMudar: (k: keyof Linha, v: string) => void, rotulo: string) => (
    <div className="flex flex-col gap-2">
      <input className={campo} placeholder={`${rotulo} — título (escolha da biblioteca ou digite)`} list="musicas-biblioteca" maxLength={120} value={l.titulo} onChange={(e) => aoMudar("titulo", e.target.value)} />
      <div className="flex gap-2">
        <input className={campo} placeholder="Artista ou ministério (opcional)" maxLength={120} value={l.artista} onChange={(e) => aoMudar("artista", e.target.value)} />
        <input className={`${campo} !w-28`} placeholder="Tom" list="tons-repertorio" maxLength={4} value={l.tom} onChange={(e) => aoMudar("tom", e.target.value)} />
      </div>
      {l.musicaId && <p className="text-xs text-emerald-700 dark:text-emerald-400">✓ Da biblioteca</p>}
    </div>
  );

  return (
    <>
      <datalist id="musicas-biblioteca">{biblioteca.map((m) => <option key={m.id} value={m.titulo} label={m.artista ?? undefined} />)}</datalist>
      <datalist id="tons-repertorio">{TONS.map((t) => <option key={t} value={t} />)}</datalist>
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
        {temOfertorio && linha(ofertorio, (k, v) => setOfertorio((o) => aplicar(o, k, v)), "Ofertório")}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
        <h2 className="font-medium">Encerramento</h2>
        {linha(encerramento, (k, v) => setEncerramento((o) => aplicar(o, k, v)), "Encerramento")}
      </section>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {aviso && !erro && <p className="text-sm text-emerald-700 dark:text-emerald-400">{aviso}</p>}
      {!jaPublicado && programadoPara && !aviso && (
        <p className="rounded-xl bg-violet-50 px-4 py-2 text-sm text-violet-800 dark:bg-violet-950/40 dark:text-violet-300">⏰ Programado: o aviso sai às 7h30 do dia do culto.</p>
      )}
      {jaPublicado ? (
        <button onClick={() => salvar("agora")} disabled={ocupado} className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60">
          {ocupado ? "Salvando…" : "Atualizar e notificar agora"}
        </button>
      ) : (
        <>
          <button onClick={() => salvar("agora")} disabled={ocupado} className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60">
            {ocupado ? "Salvando…" : "Notificar agora"}
          </button>
          {podeProgramar && (
            <button onClick={() => salvar("programar")} disabled={ocupado} className="h-12 rounded-xl border border-violet-600 font-medium text-violet-700 disabled:opacity-60 dark:text-violet-300">
              Programar para 7h30 do dia do culto
            </button>
          )}
          <button onClick={() => salvar("rascunho")} disabled={ocupado} className="h-11 rounded-xl border border-neutral-300 text-sm disabled:opacity-60 dark:border-neutral-700">
            Salvar rascunho (sem avisar)
          </button>
        </>
      )}
      <p className="text-xs text-neutral-500">
        {jaPublicado
          ? "Cada alteração guarda o horário e avisa a equipe de Louvor escalada e a Projeção escalada por WhatsApp. Se nada mudou, ninguém é avisado de novo."
          : "Quem recebe o aviso: a equipe de Louvor e a Projeção escalados no culto. Rascunho e programação ficam invisíveis para eles até o aviso sair."}
      </p>
    </>
  );
}
