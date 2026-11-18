"use client";

import { useState, useTransition } from "react";
import { alternarDia, aplicarAtalho, salvarSoDiasMarcados, type Atalho } from "./acoes";
import { primeiraMaiuscula } from "@/lib/datas";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Atalhos: servir só aos fins de semana, só durante a semana ou todos os dias. */
export function Atalhos({ atual }: { atual: Atalho | null }) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState<Atalho | null>(atual);
  const opcoes: { id: Atalho; titulo: string; texto: string }[] = [
    { id: "todos", titulo: "Todos os dias", texto: "Posso em qualquer dia da semana" },
    { id: "fim_de_semana", titulo: "Só fins de semana", texto: "Sábado e domingo" },
    { id: "semana", titulo: "Só durante a semana", texto: "Segunda a sexta" },
  ];
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-neutral-500">Em que dias da semana eu posso?</h2>
      <div className="flex flex-col gap-2">
        {opcoes.map((o) => (
          <button
            key={o.id}
            disabled={ocupado}
            onClick={() =>
              iniciar(async () => {
                const r = await aplicarAtalho(o.id);
                setErro(r.erro);
                if (!r.erro) setEscolhido(o.id);
              })
            }
            className={`rounded-xl border p-3 text-left disabled:opacity-60 ${escolhido === o.id ? "border-violet-500 bg-violet-50 dark:bg-violet-950" : "border-neutral-300 dark:border-neutral-700"}`}
          >
            <span className="block font-medium">{o.titulo}</span>
            <span className="block text-sm text-neutral-500">{o.texto}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        Isso substitui os ajustes por culto abaixo. Depois você ainda pode mudar cada culto e marcar dias especiais no calendário.
      </p>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </section>
  );
}

/** Calendário: o voluntário toca nos dias em que PODE servir. */
export function Calendario({
  hoje,
  marcados,
  diasComEvento,
  soDiasMarcados,
}: {
  hoje: string;
  marcados: string[];
  diasComEvento: string[];
  soDiasMarcados: boolean;
}) {
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [sel, setSel] = useState(() => new Set(marcados));
  const [so, setSo] = useState(soDiasMarcados);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const eventos = new Set(diasComEvento);

  const [ano, m] = mes.split("-").map(Number);
  const primeiroDow = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const celulas: (number | null)[] = [...Array(primeiroDow).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const somarMes = (delta: number) => {
    const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
    setMes(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const limiteMax = (() => {
    const d = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1 + 6, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  })();

  function alternar(dia: string) {
    const marcar = !sel.has(dia);
    setSel((s) => {
      const n = new Set(s);
      if (marcar) n.add(dia);
      else n.delete(dia);
      return n;
    });
    iniciar(async () => {
      const r = await alternarDia(dia, marcar);
      setErro(r.erro);
      if (r.erro)
        setSel((s) => {
          const n = new Set(s);
          if (marcar) n.delete(dia);
          else n.add(dia);
          return n;
        });
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-medium text-neutral-500">Calendário: dias em que posso servir</h2>
      <p className="text-sm text-neutral-500">
        Toque nos dias em que você tem disponibilidade. Um dia marcado vale mesmo que a regra da semana diga que você não pode.
      </p>

      <button
        disabled={ocupado}
        onClick={() =>
          iniciar(async () => {
            const novo = !so;
            const r = await salvarSoDiasMarcados(novo);
            setErro(r.erro);
            if (!r.erro) setSo(novo);
          })
        }
        className={`flex items-start gap-3 rounded-xl border p-3 text-left disabled:opacity-60 ${so ? "border-violet-500 bg-violet-50 dark:bg-violet-950" : "border-neutral-300 dark:border-neutral-700"}`}
      >
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${so ? "border-violet-600 bg-violet-600 text-white" : "border-neutral-400"}`}>{so ? "✓" : ""}</span>
        <span>
          <span className="block font-medium">Só sirvo nos dias que eu marcar</span>
          <span className="block text-sm text-neutral-500">Fora dos dias marcados, o coordenador não me sugere.</span>
        </span>
      </button>

      <div className="flex items-center justify-between">
        <button disabled={mes <= hoje.slice(0, 7)} onClick={() => somarMes(-1)} className="h-9 w-9 rounded-lg border border-neutral-300 disabled:opacity-30 dark:border-neutral-700" aria-label="Mês anterior">‹</button>
        <p className="font-medium">{primeiraMaiuscula(MESES[m - 1])} de {ano}</p>
        <button disabled={mes >= limiteMax} onClick={() => somarMes(1)} className="h-9 w-9 rounded-lg border border-neutral-300 disabled:opacity-30 dark:border-neutral-700" aria-label="Próximo mês">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {SEMANA.map((d, i) => (
          <span key={i} className="py-1 text-xs text-neutral-500">{d}</span>
        ))}
        {celulas.map((n, i) => {
          if (n === null) return <span key={`v${i}`} />;
          const dia = `${mes}-${String(n).padStart(2, "0")}`;
          const passado = dia < hoje;
          const marcado = sel.has(dia);
          return (
            <button
              key={dia}
              disabled={passado}
              onClick={() => alternar(dia)}
              aria-pressed={marcado}
              aria-label={`${n} de ${MESES[m - 1]}${marcado ? ", posso servir" : ""}`}
              className={`relative flex h-11 items-center justify-center rounded-lg text-sm font-medium disabled:opacity-30 ${marcado ? "bg-violet-600 text-white" : "border border-neutral-200 dark:border-neutral-800"} ${dia === hoje ? "ring-2 ring-violet-400" : ""}`}
            >
              {n}
              {eventos.has(dia) && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${marcado ? "bg-white" : "bg-pink-500"}`} />}
            </button>
          );
        })}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-violet-600" />posso servir</span>
        <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-pink-500" />tem evento na igreja</span>
      </p>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </section>
  );
}
