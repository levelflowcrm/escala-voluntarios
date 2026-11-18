"use client";

import { useEffect, useRef, useState } from "react";
import { CORES, corDoEvento } from "@/lib/cores-evento";
import { diaInicial, type DiaFaixa } from "@/lib/faixa-dias";

export type EventoDoDia = {
  id: string;
  titulo: string;
  inicio: string;
  local: string | null;
  tipo_agenda: string | null;
  cor: string | null;
  dia: string;
};
export type MinhaEscala = { eventoId: string; funcao: string; ministerio: string; status: "pendente" | "confirmado" };

const FUSO = "America/Sao_Paulo";
const horaFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const tituloDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const tituloMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
const asData = (dia: string) => new Date(`${dia}T12:00:00Z`);

/** Faixa de dias com rolagem lateral: pontinho = tem evento; preenchido = você está escalado. */
export function FaixaDias({ faixa, eventos, minhas }: { faixa: DiaFaixa[]; eventos: EventoDoDia[]; minhas: MinhaEscala[] }) {
  const [sel, setSel] = useState(() => diaInicial(faixa));
  const selRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const doDia = eventos.filter((e) => e.dia === sel);
  const escalaDe = (id: string) => minhas.find((m) => m.eventoId === id);

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm font-medium capitalize text-neutral-500">{tituloMes.format(asData(sel))}</p>
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2" role="listbox" aria-label="Dias">
        {faixa.map((d) => {
          const ativo = d.dia === sel;
          return (
            <button
              key={d.dia}
              ref={ativo ? selRef : undefined}
              role="option"
              aria-selected={ativo}
              onClick={() => setSel(d.dia)}
              className={`relative flex h-20 w-14 shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-2xl border text-center ${
                d.escalado
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-neutral-200 dark:border-neutral-800"
              } ${ativo ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-white dark:ring-offset-black" : ""} ${
                !d.escalado && d.eventos === 0 ? "text-neutral-400" : ""
              }`}
            >
              <span className="text-[11px] leading-none">{d.hoje ? "Hoje" : d.semana}</span>
              <span className="text-xl font-semibold leading-none">{d.numero}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${d.eventos > 0 ? (d.escalado ? "bg-white" : "bg-pink-500") : "bg-transparent"}`}
                aria-hidden
              />
              {d.escalado && <span className="sr-only">Você está escalado</span>}
            </button>
          );
        })}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-violet-600" /> você serve</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-pink-500" /> tem evento</span>
      </p>

      <h2 className="text-sm font-medium capitalize">{tituloDia.format(asData(sel))}</h2>
      {doDia.length === 0 && <p className="text-sm text-neutral-500">Nenhum evento neste dia.</p>}
      {doDia.map((e) => {
        const cor = corDoEvento(e.tipo_agenda, e.cor);
        const m = escalaDe(e.id);
        return (
          <article key={e.id} className="flex overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className={`flex w-20 shrink-0 items-center justify-center text-lg font-semibold ${cor ? CORES[cor].card : "bg-neutral-100 dark:bg-neutral-900"}`}>
              {horaFmt.format(new Date(e.inicio))}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="font-medium">{e.titulo}</p>
              {e.local && <p className="text-sm text-neutral-500">📍 {e.local}</p>}
              {m && (
                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  {m.status === "confirmado" ? "✓ Você serve" : "⏳ Aguardando sua resposta"}: {m.funcao} · {m.ministerio}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
