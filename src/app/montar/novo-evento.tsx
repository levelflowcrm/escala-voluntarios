"use client";

import { useState } from "react";
import { SeletorCor } from "../seletor-cor";
import { criarEvento } from "./acoes";

const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

/** Formulário de evento avulso (conferência, ensaio especial, reunião...). */
export function NovoEvento({ rodar }: { rodar: (acao: () => Promise<{ erro: string | null; aviso?: string }>) => void }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("19:30");
  const [reuniao, setReuniao] = useState(false);
  const [cor, setCor] = useState("");

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="h-11 rounded-xl border border-neutral-300 px-4 text-sm font-medium dark:border-neutral-700">
        + Novo evento
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <p className="font-medium">Novo evento avulso</p>
      <input className={campo} placeholder="Nome (ex.: Conferência de Jovens)" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <div className="flex gap-2">
        <input className={campo} type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
        <input className={`${campo} max-w-32`} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <SeletorCor valor={cor} aoMudar={setCor} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={reuniao} onChange={(e) => setReuniao(e.target.checked)} className="h-4 w-4" />
        Reunião com todos convocados (sem escala por função)
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => {
            rodar(() => criarEvento(titulo, dia, hora, reuniao, cor));
            setTitulo("");
            setCor("");
          }}
          className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-medium text-white"
        >
          Criar evento
        </button>
        <button onClick={() => setAberto(false)} className="h-11 rounded-xl border border-neutral-300 px-4 text-sm dark:border-neutral-700">
          Fechar
        </button>
      </div>
    </div>
  );
}
