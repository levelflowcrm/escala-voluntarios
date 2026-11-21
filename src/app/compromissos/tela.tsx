"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BotaoAgenda } from "../botao-agenda";
import { CARTAO_COMPROMISSO, ehLink, rotuloCompromisso, TIPOS_COMPROMISSO, type TipoCompromisso } from "@/lib/compromissos";
import { diaNoFuso, fmtDataHora } from "@/lib/datas";
import { cancelarCompromisso, criarCompromisso } from "./acoes";

export type Compromisso = {
  id: string;
  tipo: string;
  inicio: string;
  local: string | null;
  observacao: string | null;
  ministerio: string;
  criadoPor: string | null;
  possoCancelar: boolean;
};

const campo = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";
const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-2 text-sm ${ativo ? "border-yellow-500 bg-yellow-200 text-yellow-950" : "border-neutral-300 dark:border-neutral-700"}`;

function Formulario({ ministerios }: { ministerios: { id: string; nome: string }[] }) {
  const [min, setMin] = useState(ministerios[0].id);
  const [tipo, setTipo] = useState<TipoCompromisso | null>(null);
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-yellow-300 bg-yellow-50/50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
      <div>
        <h2 className="font-medium">Marcar compromisso do time</h2>
        <p className="text-xs text-neutral-500">Aparece só para quem é do ministério. Não entra no calendário oficial da igreja.</p>
      </div>

      {ministerios.length > 1 && (
        <select className={`${campo} h-11`} value={min} onChange={(e) => setMin(e.target.value)}>
          {ministerios.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap gap-2">
        {TIPOS_COMPROMISSO.map((t) => (
          <button key={t.valor} type="button" onClick={() => setTipo(t.valor)} className={chip(tipo === t.valor)}>
            {t.icone} {t.texto}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-neutral-500">Data</span>
          <input type="date" className={`${campo} h-11`} value={dia} min={diaNoFuso(new Date())} onChange={(e) => setDia(e.target.value)} />
        </label>
        <label className="flex w-32 flex-col gap-1 text-sm">
          <span className="text-neutral-500">Horário</span>
          <input type="time" className={`${campo} h-11`} value={hora} onChange={(e) => setHora(e.target.value)} />
        </label>
      </div>

      <input
        className={`${campo} h-11`}
        maxLength={300}
        placeholder={tipo === "reuniao_online" ? "Link da reunião (Meet, Zoom...)" : "Local (opcional)"}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      <textarea
        className={`${campo} py-2`}
        rows={2}
        maxLength={1000}
        placeholder="Observação (opcional). Ex.: trazer o notebook"
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
      />

      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            if (!tipo) return setMsg({ ok: false, texto: "Escolha o tipo do compromisso" });
            const r = await criarCompromisso({ ministerioId: min, tipo, dia, hora, local, observacao });
            if (r.erro) setMsg({ ok: false, texto: r.erro });
            else {
              setTipo(null);
              setDia("");
              setHora("");
              setLocal("");
              setObservacao("");
              setMsg({ ok: true, texto: "Compromisso marcado para o time ✓" });
            }
          })
        }
        className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Marcando…" : "Marcar compromisso"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.texto}</p>}
    </section>
  );
}

function Cartao({ c }: { c: Compromisso }) {
  const [pendente, iniciar] = useTransition();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const r = rotuloCompromisso(c.tipo);
  return (
    <article className={`flex flex-col gap-1 rounded-xl border p-4 ${CARTAO_COMPROMISSO}`}>
      <p className="font-medium">{fmtDataHora.format(new Date(c.inicio))}</p>
      <p className="text-sm">
        {r.icone} {r.texto} · <span className="text-yellow-900">{c.ministerio}</span>
      </p>
      {c.local &&
        (ehLink(c.local) ? (
          <a href={c.local} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-violet-800 underline">
            Entrar na reunião
          </a>
        ) : (
          <p className="text-sm text-yellow-900">📍 {c.local}</p>
        ))}
      {c.observacao && <p className="whitespace-pre-line text-sm text-yellow-900">{c.observacao}</p>}
      {c.criadoPor && <p className="text-xs text-yellow-800">Marcado por {c.criadoPor}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
        <BotaoAgenda
          titulo={`${r.texto} · ${c.ministerio}`}
          sobreFundoClaro
          inicio={c.inicio}
          local={c.local ?? undefined}
          descricao={[c.observacao, "Compromisso do time pelo Mais Conectados"].filter(Boolean).join("\n")}
        />
        {c.possoCancelar &&
          (confirmar ? (
            <span className="flex items-center gap-2">
              <button
                disabled={pendente}
                onClick={() => iniciar(async () => setErro((await cancelarCompromisso(c.id)).erro))}
                className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white disabled:opacity-60"
              >
                {pendente ? "Cancelando…" : "Sim, cancelar"}
              </button>
              <button onClick={() => setConfirmar(false)} className="underline">Não</button>
            </span>
          ) : (
            <button onClick={() => setConfirmar(true)} className="font-medium text-red-700 underline">
              Cancelar compromisso
            </button>
          ))}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </article>
  );
}

export function TelaCompromissos({ ministerios, compromissos }: { ministerios: { id: string; nome: string }[]; compromissos: Compromisso[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <div>
        <h1 className="text-2xl font-semibold">Compromissos do time</h1>
        <p className="text-sm text-neutral-500">Reuniões, ensaios, treinamentos e confraternizações do seu ministério.</p>
      </div>

      {ministerios.length > 0 && <Formulario ministerios={ministerios} />}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Próximos</h2>
        {compromissos.length === 0 && <p className="text-sm text-neutral-500">Nenhum compromisso marcado.</p>}
        {compromissos.map((c) => (
          <Cartao key={c.id} c={c} />
        ))}
      </section>
    </main>
  );
}
