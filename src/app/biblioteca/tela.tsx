"use client";

import { useState, useTransition } from "react";
import { type DadosMusica, filtrarMusicas, LINKS, type MusicaBiblioteca, TONS } from "@/lib/musicas";
import { criarMusica, editarMusica, excluirMusica } from "./acoes";

const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";
const VAZIA: DadosMusica = { titulo: "", artista: "", tom: "", link_letra: "", link_cifra: "", link_video: "", link_audio: "", observacao: "" };
const deMusica = (m: MusicaBiblioteca): DadosMusica => ({
  titulo: m.titulo, artista: m.artista ?? "", tom: m.tom ?? "", link_letra: m.link_letra ?? "", link_cifra: m.link_cifra ?? "",
  link_video: m.link_video ?? "", link_audio: m.link_audio ?? "", observacao: m.observacao ?? "",
});

function Formulario({ inicial, aoSalvar, aoCancelar, ocupado, erro }: {
  inicial: DadosMusica; aoSalvar: (d: DadosMusica) => void; aoCancelar: () => void; ocupado: boolean; erro: string | null;
}) {
  const [d, setD] = useState(inicial);
  const mudar = (k: keyof DadosMusica, v: string) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-violet-300 p-4 dark:border-violet-800">
      <input className={campo} placeholder="Título da música" maxLength={120} value={d.titulo} onChange={(e) => mudar("titulo", e.target.value)} />
      <input className={campo} placeholder="Artista ou ministério (opcional)" maxLength={120} value={d.artista} onChange={(e) => mudar("artista", e.target.value)} />
      <input className={campo} placeholder="Tom padrão (ex.: G, Bb, F#m)" list="tons-biblioteca" maxLength={4} value={d.tom} onChange={(e) => mudar("tom", e.target.value)} />
      <datalist id="tons-biblioteca">{TONS.map((t) => <option key={t} value={t} />)}</datalist>
      {LINKS.map((l) => (
        <input key={l.campo} className={campo} type="url" inputMode="url" placeholder={`Link da ${l.rotulo.toLowerCase()} (https://…)`} maxLength={500} value={d[l.campo]} onChange={(e) => mudar(l.campo, e.target.value)} />
      ))}
      <textarea className="min-h-20 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" placeholder="Observação (opcional)" maxLength={500} value={d.observacao} onChange={(e) => mudar("observacao", e.target.value)} />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button disabled={ocupado} onClick={() => aoSalvar(d)} className="h-11 flex-1 rounded-lg bg-violet-600 font-medium text-white disabled:opacity-60">{ocupado ? "Salvando…" : "Salvar"}</button>
        <button disabled={ocupado} onClick={aoCancelar} className="h-11 rounded-lg border border-neutral-300 px-4 dark:border-neutral-700">Cancelar</button>
      </div>
    </div>
  );
}

export function TelaBiblioteca({ musicas, podeEditar }: { musicas: MusicaBiblioteca[]; podeEditar: boolean }) {
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const lista = filtrarMusicas(musicas, busca);

  function salvar(d: DadosMusica) {
    setErro(null);
    iniciar(async () => {
      const r = editando === "nova" ? await criarMusica(d) : await editarMusica(editando as string, d);
      if (r.erro) setErro(r.erro);
      else setEditando(null);
    });
  }
  function excluir(m: MusicaBiblioteca) {
    if (!window.confirm(`Excluir "${m.titulo}" da biblioteca? Os repertórios que já usaram a música continuam como estão.`)) return;
    setErro(null);
    iniciar(async () => {
      const r = await excluirMusica(m.id);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <>
      <input className={campo} type="search" placeholder={`Buscar entre ${musicas.length} música${musicas.length === 1 ? "" : "s"}…`} value={busca} onChange={(e) => setBusca(e.target.value)} />
      {podeEditar && editando === null && (
        <button onClick={() => { setErro(null); setEditando("nova"); }} className="h-11 rounded-xl bg-violet-600 font-medium text-white">+ Nova música</button>
      )}
      {editando === "nova" && <Formulario inicial={VAZIA} aoSalvar={salvar} aoCancelar={() => setEditando(null)} ocupado={ocupado} erro={erro} />}
      {erro && editando === null && <p className="text-sm text-red-600">{erro}</p>}
      {musicas.length === 0 && editando !== "nova" && <p className="text-neutral-500">{podeEditar ? "Nenhuma música ainda. Cadastre a primeira ou monte um repertório: as músicas entram aqui sozinhas." : "Nenhuma música cadastrada ainda."}</p>}
      {musicas.length > 0 && lista.length === 0 && <p className="text-neutral-500">Nenhuma música encontrada.</p>}
      {lista.map((m) =>
        editando === m.id ? (
          <Formulario key={m.id} inicial={deMusica(m)} aoSalvar={salvar} aoCancelar={() => setEditando(null)} ocupado={ocupado} erro={erro} />
        ) : (
          <article key={m.id} className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{m.titulo}</h2>
                {m.artista && <p className="text-sm text-neutral-500">{m.artista}</p>}
              </div>
              {podeEditar && m.tom && <span className="rounded-lg bg-pink-100 px-2 py-1 text-sm font-semibold text-pink-800 dark:bg-pink-950 dark:text-pink-300">{m.tom}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {LINKS.filter((l) => m[l.campo]).map((l) => (
                <a key={l.campo} href={m[l.campo] as string} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700">
                  {l.icone} {l.rotulo}
                </a>
              ))}
            </div>
            {m.observacao && <p className="text-sm text-neutral-600 dark:text-neutral-400">{m.observacao}</p>}
            {podeEditar && (
              <div className="flex gap-4 text-sm">
                <button onClick={() => { setErro(null); setEditando(m.id); }} className="underline">Editar</button>
                <button disabled={ocupado} onClick={() => excluir(m)} className="text-red-600 underline">Excluir</button>
              </div>
            )}
          </article>
        ),
      )}
    </>
  );
}
