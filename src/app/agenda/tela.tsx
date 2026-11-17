"use client";

import { useState, useTransition } from "react";
import { fmtDataHora } from "@/lib/datas";
import { TIPOS } from "@/lib/agenda-tipos";
import { CORES, corDoEvento } from "@/lib/cores-evento";
import { SeletorCor } from "../seletor-cor";
import { REPETICOES } from "@/lib/recorrencia";
import { apagarEventoAgenda, criarEventoAgenda, editarEventoAgenda, type Alcance, type DadosEvento } from "./acoes";

export type EventoAgenda = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  observacao: string | null;
  tipo_agenda: string | null;
  cor: string | null;
  serie_id: string | null;
  convocacao_geral: boolean;
};

const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";
const FUSO = "America/Sao_Paulo";
const diaFmt = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const horaFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const vazio: DadosEvento = { titulo: "", tipo: "conferencia", cor: "", dia: "", hora: "19:30", diaFim: "", horaFim: "", local: "", descricao: "", repeticao: "nenhuma", ate: "", convocacaoGeral: false };

function doEvento(e: EventoAgenda): DadosEvento {
  const ini = new Date(e.inicio);
  const fim = e.fim ? new Date(e.fim) : null;
  return {
    titulo: e.titulo,
    tipo: e.tipo_agenda ?? "outro",
    cor: e.cor ?? "",
    dia: diaFmt.format(ini),
    hora: horaFmt.format(ini),
    diaFim: fim ? diaFmt.format(fim) : "",
    horaFim: fim ? horaFmt.format(fim) : "",
    local: e.local ?? "",
    descricao: e.observacao ?? "",
    convocacaoGeral: e.convocacao_geral,
  };
}

function Formulario({
  inicial,
  rotulo,
  aoEnviar,
  aoFechar,
  emSerie = false,
  permiteRepetir = false,
}: {
  inicial: DadosEvento;
  rotulo: string;
  emSerie?: boolean;
  permiteRepetir?: boolean;
  aoEnviar: (d: DadosEvento, alcance: Alcance) => Promise<{ erro: string | null }>;
  aoFechar: () => void;
}) {
  const [d, setD] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [alcance, setAlcance] = useState<Alcance>("este");
  const [ocupado, iniciar] = useTransition();
  const mudar = (k: keyof DadosEvento) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: ev.target.value });

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <input className={campo} placeholder="Nome do evento" maxLength={120} value={d.titulo} onChange={mudar("titulo")} />
      <select className={campo} value={d.tipo} onChange={mudar("tipo")}>
        {Object.entries(TIPOS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <SeletorCor valor={d.cor ?? ""} aoMudar={(cor) => setD({ ...d, cor })} />
      {d.tipo === "locacao" && !d.cor && <p className="text-xs text-neutral-500">Locações saem em pêssego por padrão.</p>}
      <p className="text-xs text-neutral-500">Início</p>
      <div className="flex gap-2">
        <input className={campo} type="date" value={d.dia} onChange={mudar("dia")} />
        <input className={`${campo} max-w-32`} type="time" value={d.hora} onChange={mudar("hora")} />
      </div>
      <p className="text-xs text-neutral-500">Fim (opcional)</p>
      <div className="flex gap-2">
        <input className={campo} type="date" value={d.diaFim} onChange={mudar("diaFim")} />
        <input className={`${campo} max-w-32`} type="time" value={d.horaFim} onChange={mudar("horaFim")} />
      </div>
      <input className={campo} placeholder="Local (opcional)" maxLength={120} value={d.local} onChange={mudar("local")} />
      <textarea className={`${campo} h-20 py-2`} placeholder="Descrição (opcional)" maxLength={1000} value={d.descricao} onChange={mudar("descricao")} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!d.convocacaoGeral} onChange={(ev) => setD({ ...d, convocacaoGeral: ev.target.checked })} className="h-4 w-4" />
        Reunião com todos convocados (sem escala por função)
      </label>
      {permiteRepetir && (
        <>
          <select className={campo} value={d.repeticao} onChange={mudar("repeticao")}>
            {Object.entries(REPETICOES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {d.repeticao !== "nenhuma" && (
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Repete até
              <input className={campo} type="date" min={d.dia} value={d.ate} onChange={mudar("ate")} />
            </label>
          )}
        </>
      )}
      {emSerie && (
        <select className={campo} value={alcance} onChange={(e) => setAlcance(e.target.value as Alcance)}>
          <option value="este">Aplicar só a este evento</option>
          <option value="proximos">Aplicar a este e aos próximos da série</option>
        </select>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          disabled={ocupado}
          onClick={() =>
            iniciar(async () => {
              const r = await aoEnviar(d, alcance);
              setErro(r.erro);
              if (!r.erro) aoFechar();
            })
          }
          className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-60"
        >
          {ocupado ? "Salvando…" : rotulo}
        </button>
        <button onClick={aoFechar} className="h-11 rounded-xl border border-neutral-300 px-4 text-sm dark:border-neutral-700">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function TelaAgenda({ eventos, admin }: { eventos: EventoAgenda[]; admin: boolean }) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  return (
    <>
      {admin && !criando && (
        <button onClick={() => setCriando(true)} className="h-12 rounded-xl bg-violet-600 font-medium text-white">
          + Novo evento
        </button>
      )}
      {criando && (
        <Formulario inicial={vazio} rotulo="Criar evento" permiteRepetir aoEnviar={(d) => criarEventoAgenda(d)} aoFechar={() => setCriando(false)} />
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {eventos.length === 0 && <p className="text-neutral-500">Nenhum evento na agenda por enquanto.</p>}
      {eventos.map((e) =>
        editando === e.id ? (
          <Formulario
            key={e.id}
            inicial={doEvento(e)}
            rotulo="Salvar"
            emSerie={!!e.serie_id}
            aoEnviar={(d, alcance) => editarEventoAgenda(e.id, d, alcance)}
            aoFechar={() => setEditando(null)}
          />
        ) : (
          <article
            key={e.id}
            className={`flex flex-col gap-1 rounded-xl border p-4 ${(() => {
              const c = corDoEvento(e.tipo_agenda, e.cor);
              return c ? CORES[c].card : "border-neutral-300 dark:border-neutral-700";
            })()}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium capitalize">{fmtDataHora.format(new Date(e.inicio))}</p>
              {e.tipo_agenda && (
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-black/30 dark:text-neutral-200">
                  {TIPOS[e.tipo_agenda]}
                </span>
              )}
            </div>
            <p className="font-medium">{e.titulo}</p>
            {e.fim && <p className="text-sm text-neutral-500">Até <span className="capitalize">{fmtDataHora.format(new Date(e.fim))}</span></p>}
            {e.local && <p className="text-sm text-neutral-500">📍 {e.local}</p>}
            {e.observacao && <p className="text-sm text-neutral-600 dark:text-neutral-300">{e.observacao}</p>}
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              <a href={`/agenda/evento/${e.id}`} className="text-violet-700 underline dark:text-violet-300">📅 Adicionar à agenda</a>
              {admin && (
                <>
                  <button onClick={() => setEditando(e.id)} className="text-neutral-500 underline">Editar</button>
                  <button
                    disabled={ocupado}
                    onClick={() => {
                      const todos = !!e.serie_id && confirm(`“${e.titulo}” se repete. OK = apagar este e os próximos da série. Cancelar = escolher só este.`);
                      const alcance: Alcance = todos ? "proximos" : "este";
                      if (todos || confirm(`Apagar só este evento (“${e.titulo}”)? Isso não pode ser desfeito.`))
                        iniciar(async () => setErro((await apagarEventoAgenda(e.id, alcance)).erro));
                    }}
                    className="text-red-600 underline"
                  >
                    Apagar
                  </button>
                </>
              )}
            </div>
          </article>
        ),
      )}
    </>
  );
}
