"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fmtDataHora } from "@/lib/datas";
import { GRAVIDADES, TIPOS, type CultoOpcao, type Gravidade, type StatusOcorrencia, type TipoOcorrencia } from "@/lib/ocorrencias";
import { registrar, tratar } from "./acoes";

export type Ocorrencia = {
  id: string;
  tipo: TipoOcorrencia;
  gravidade: Gravidade;
  texto: string;
  status: StatusOcorrencia;
  resposta: string | null;
  criadoEm: string;
  tratadoEm: string | null;
  ministerio: string;
  culto: { titulo: string; inicio: string } | null;
  autor: string;
  tratador: string | null;
  recebida: boolean; // chegou para mim como facilitador
};

const STATUS: Record<StatusOcorrencia, { texto: string; classe: string }> = {
  aberta: { texto: "Aberta", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  ciente: { texto: "Facilitador ciente", classe: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  resolvida: { texto: "Resolvida", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};
const GRAV: Record<Gravidade, string> = {
  urgente: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  normal: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  informativa: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};
const campo = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";
const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-2 text-sm ${
    ativo
      ? "border-violet-600 bg-violet-600 text-white"
      : "border-neutral-300 dark:border-neutral-700"
  }`;

function Formulario({ ministerios, cultos, sugerido }: { ministerios: { id: string; nome: string }[]; cultos: CultoOpcao[]; sugerido: string | null }) {
  const inicial = cultos.find((c) => c.eventoId === sugerido) ?? null;
  const [culto, setCulto] = useState<string>(inicial ? `${inicial.eventoId}|${inicial.ministerioId}` : "");
  const [min, setMin] = useState(inicial?.ministerioId ?? ministerios[0].id);
  const [tipo, setTipo] = useState<TipoOcorrencia | null>(null);
  const [gravidade, setGravidade] = useState<Gravidade>("normal");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const escolherCulto = (v: string) => {
    setCulto(v);
    const m = v.split("|")[1];
    if (m) setMin(m);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <h2 className="font-medium">Aconteceu algo no culto?</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">Em qual culto</span>
        <select className={`${campo} h-11`} value={culto} onChange={(e) => escolherCulto(e.target.value)}>
          {cultos.map((c) => (
            <option key={`${c.eventoId}|${c.ministerioId}`} value={`${c.eventoId}|${c.ministerioId}`}>
              {c.titulo} · {fmtDataHora.format(new Date(c.inicio))}
            </option>
          ))}
          <option value="">Fora de culto / outro momento</option>
        </select>
      </label>

      {ministerios.length > 1 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Ministério</span>
          <select className={`${campo} h-11`} value={min} onChange={(e) => setMin(e.target.value)} disabled={!!culto}>
            {ministerios.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">Tipo</span>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button key={t.valor} type="button" onClick={() => setTipo(t.valor)} className={chip(tipo === t.valor)}>
              {t.icone} {t.texto}
            </button>
          ))}
        </div>
        {tipo && <span className="text-xs text-neutral-500">Ex.: {TIPOS.find((t) => t.valor === tipo)?.exemplos}</span>}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">Gravidade</span>
        <div className="flex flex-wrap gap-2">
          {GRAVIDADES.map((g) => (
            <button
              key={g.valor}
              type="button"
              onClick={() => setGravidade(g.valor)}
              className={g.valor === "urgente" && gravidade === "urgente" ? "rounded-full border border-red-600 bg-red-600 px-3 py-2 text-sm text-white" : chip(gravidade === g.valor)}
            >
              {g.texto}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-500">{GRAVIDADES.find((g) => g.valor === gravidade)?.dica}</span>
      </div>

      <textarea
        className={`${campo} py-2`}
        rows={5}
        maxLength={2000}
        placeholder="O que aconteceu, em que momento e o que já foi feito."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            if (!tipo) return setMsg({ ok: false, texto: "Escolha o tipo da ocorrência" });
            const [eventoId, ministerioDoCulto] = culto.split("|");
            const r = await registrar({
              ministerioId: ministerioDoCulto || min,
              eventoId: eventoId || null,
              tipo,
              gravidade,
              texto,
            });
            if (r.erro) setMsg({ ok: false, texto: r.erro });
            else {
              setTexto("");
              setTipo(null);
              setGravidade("normal");
              setMsg({ ok: true, texto: "Registrada e enviada ao facilitador ✓" });
            }
          })
        }
        className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Enviar ao facilitador"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.texto}</p>}
    </section>
  );
}

function Cartao({ o }: { o: Ocorrencia }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const tipo = TIPOS.find((t) => t.valor === o.tipo)!;
  const grav = GRAVIDADES.find((g) => g.valor === o.gravidade)!;
  const st = STATUS[o.status];
  const acao = (status: "ciente" | "resolvida", texto: string, principal = false) => (
    <button
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await tratar(o.id, status, resposta);
          setErro(r.erro);
          if (!r.erro) setResposta("");
        })
      }
      className={`h-10 flex-1 rounded-lg px-3 text-sm font-medium disabled:opacity-60 ${
        principal ? "bg-emerald-600 text-white" : "border border-neutral-300 dark:border-neutral-700"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <article className={`flex flex-col gap-2 rounded-xl border p-4 ${o.gravidade === "urgente" && o.status !== "resolvida" ? "border-red-300 dark:border-red-900" : "border-neutral-200 dark:border-neutral-800"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium">{tipo.icone} {tipo.texto}</span>
        {o.gravidade !== "normal" && <span className={`rounded-full px-2 py-0.5 text-xs ${GRAV[o.gravidade]}`}>{grav.texto}</span>}
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${st.classe}`}>{st.texto}</span>
      </div>
      <p className="whitespace-pre-line">{o.texto}</p>
      <p className="text-xs text-neutral-500">
        {o.recebida && `${o.autor} · `}
        {o.culto ? `${o.culto.titulo} (${fmtDataHora.format(new Date(o.culto.inicio))})` : o.ministerio}
        {" · registrada "}
        {fmtDataHora.format(new Date(o.criadoEm))}
      </p>

      {o.resposta && (
        <div className="rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">Resposta{o.tratador ? ` de ${o.tratador}` : " do facilitador"}</p>
          <p className="whitespace-pre-line">{o.resposta}</p>
        </div>
      )}

      {o.recebida && o.status !== "resolvida" && (
        <div className="flex flex-col gap-2">
          <textarea
            className={`${campo} py-2 text-sm`}
            rows={2}
            maxLength={1000}
            placeholder="Resposta para quem registrou (opcional)"
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
          />
          <div className="flex gap-2">
            {o.status === "aberta" && acao("ciente", "Estou ciente")}
            {acao("resolvida", "Resolvida", true)}
          </div>
        </div>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </article>
  );
}

export function TelaOcorrencias({
  ministerios,
  cultos,
  sugerido,
  recebidas,
  minhas,
}: {
  ministerios: { id: string; nome: string }[];
  cultos: CultoOpcao[];
  sugerido: string | null;
  recebidas: Ocorrencia[];
  minhas: Ocorrencia[];
}) {
  const [verResolvidas, setVerResolvidas] = useState(false);
  const pendentes = recebidas.filter((o) => o.status !== "resolvida");
  const resolvidas = recebidas.filter((o) => o.status === "resolvida");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <div>
        <h1 className="text-2xl font-semibold">Ocorrências</h1>
        <p className="text-sm text-neutral-500">Registre o que aconteceu no culto. O facilitador do seu ministério recebe na hora.</p>
      </div>

      {ministerios.length > 0 ? (
        <Formulario ministerios={ministerios} cultos={cultos} sugerido={sugerido} />
      ) : (
        <p className="text-neutral-500">Você ainda não está em nenhum ministério.</p>
      )}

      {recebidas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">
            Recebidas do time {pendentes.length > 0 && `· ${pendentes.length} para tratar`}
          </h2>
          {pendentes.length === 0 && <p className="text-sm text-neutral-500">Nada pendente. 🙌</p>}
          {pendentes.map((o) => <Cartao key={o.id} o={o} />)}
          {resolvidas.length > 0 && (
            <button onClick={() => setVerResolvidas((v) => !v)} className="self-start text-sm text-violet-700 underline dark:text-violet-300">
              {verResolvidas ? "Esconder resolvidas" : `Ver resolvidas (${resolvidas.length})`}
            </button>
          )}
          {verResolvidas && resolvidas.map((o) => <Cartao key={o.id} o={o} />)}
        </section>
      )}

      {minhas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Minhas ocorrências</h2>
          {minhas.map((o) => <Cartao key={o.id} o={o} />)}
        </section>
      )}
    </main>
  );
}
