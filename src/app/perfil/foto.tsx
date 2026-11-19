"use client";

import { useRef, useState, useTransition } from "react";
import { MAX_MINIATURA, reduzirFoto } from "@/lib/foto";
import { removerFoto, salvarFoto } from "./foto-acoes";

/** Foto do perfil: escolher/tirar, ajustar para quadrado e salvar. A foto aparece na surpresa de aniversário. */
export function FotoPerfil({ nome, inicial }: { nome: string; inicial: string | null }) {
  const [foto, setFoto] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    iniciar(async () => {
      try {
        const url = await reduzirFoto(arquivo);
        const mini = await reduzirFoto(arquivo, 96, MAX_MINIATURA);
        const r = await salvarFoto(url, mini);
        if (r.erro) setErro(r.erro);
        else setFoto(url);
      } catch {
        setErro("Não consegui usar essa imagem. Tente outra foto.");
      }
    });
  }

  return (
    <section className="flex items-center gap-4">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={`Foto de ${nome}`} className="h-24 w-24 rounded-full object-cover ring-2 ring-violet-400" />
      ) : (
        <div aria-hidden className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-100 text-3xl font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          {nome.trim().charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col items-start gap-2">
        <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={escolher} />
        <button disabled={ocupado} onClick={() => entrada.current?.click()} className="h-10 rounded-lg border border-neutral-300 px-4 text-sm dark:border-neutral-700">
          {ocupado ? "Enviando…" : foto ? "Trocar foto" : "Adicionar foto"}
        </button>
        {foto && (
          <button
            disabled={ocupado}
            onClick={() => iniciar(async () => { const r = await removerFoto(); if (r.erro) setErro(r.erro); else setFoto(null); })}
            className="text-sm text-red-600 underline"
          >
            Remover foto
          </button>
        )}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <p className="text-xs text-neutral-500">Seus colegas de escala veem sua foto no “Time de hoje”, e usamos no seu aniversário, às 9h. 🎂</p>
      </div>
    </section>
  );
}
