"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DIAS_SEMANA } from "@/lib/cultos";
import { alternarCultoFixo, criarPausa, previaPausa, removerPausa, salvarCultoFixo, type DadosCultoFixo } from "./acoes";

export type CultoFixo = { id: string; nome: string; diaSemana: number; hora: string; ativo: boolean };
export type PausaCulto = { id: string; tipo_evento_id: string | null; de: string; ate: string; motivo: string | null };

const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";
const dataBr = (d: string) => d.split("-").reverse().join("/");

type Retorno = { erro: string | null; aviso?: string };

function FormCulto({ inicial, rotulo, aoEnviar, aoFechar }: { inicial: DadosCultoFixo; rotulo: string; aoEnviar: (d: DadosCultoFixo) => Promise<Retorno>; aoFechar: () => void }) {
  const [d, setD] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <input className={campo} placeholder="Nome do culto" maxLength={80} value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
      <div className="flex gap-2">
        <select className={campo} value={d.diaSemana} onChange={(e) => setD({ ...d, diaSemana: Number(e.target.value) })}>
          {DIAS_SEMANA.map((n, i) => (
            <option key={n} value={i}>{n}</option>
          ))}
        </select>
        <input className={`${campo} max-w-32`} type="time" step={300} value={d.hora} onChange={(e) => setD({ ...d, hora: e.target.value })} />
      </div>
      {d.id && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={!!d.aplicarFuturos} onChange={(e) => setD({ ...d, aplicarFuturos: e.target.checked })} />
          <span>Aplicar também aos cultos futuros já criados (novo horário e, se mudou o dia, vai para o novo dia na mesma semana)</span>
        </label>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          disabled={ocupado}
          onClick={() =>
            iniciar(async () => {
              const r = await aoEnviar(d);
              setErro(r.erro);
              if (!r.erro) aoFechar();
            })
          }
          className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-60"
        >
          {ocupado ? "Salvando…" : rotulo}
        </button>
        <button onClick={aoFechar} className="h-11 rounded-xl border border-neutral-300 px-4 text-sm dark:border-neutral-700">Cancelar</button>
      </div>
    </div>
  );
}

function FormPausa({ cultos, aoAviso }: { cultos: CultoFixo[]; aoAviso: (m: { tipo: "erro" | "ok"; texto: string }) => void }) {
  const [tipoId, setTipoId] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ocupado, iniciar] = useTransition();

  const registrar = () =>
    iniciar(async () => {
      const dados = { tipoId: tipoId || null, de, ate: ate || de, motivo };
      const previa = await previaPausa(dados);
      if (previa.erro) return aoAviso({ tipo: "erro", texto: previa.erro });
      if (previa.cultos > 0) {
        const quem = previa.escalados > 0 ? ` e tirar ${previa.escalados} escala(s) de voluntários` : "";
        if (!confirm(`Isso vai remover ${previa.cultos} culto(s) já criado(s)${quem}. Continuar?`)) return;
      }
      const r = await criarPausa(dados);
      aoAviso(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: r.aviso ?? "Pausa criada." });
      if (!r.erro) {
        setDe("");
        setAte("");
        setMotivo("");
      }
    });

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-3 dark:border-neutral-700">
      <select className={campo} value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
        <option value="">Todos os cultos fixos</option>
        {cultos.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
          De
          <input className={campo} type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
          Até (vazio = só esse dia)
          <input className={campo} type="date" min={de} value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
      </div>
      <input className={campo} placeholder="Motivo (opcional) — ex.: recesso de fim de ano" maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <button disabled={ocupado || !de} onClick={registrar} className="h-11 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-50">
        {ocupado ? "Verificando…" : "Registrar pausa"}
      </button>
    </div>
  );
}

export function TelaCultosFixos({ cultos, pausas }: { cultos: CultoFixo[]; pausas: PausaCulto[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const nomeDe = (id: string | null) => (id ? (cultos.find((c) => c.id === id)?.nome ?? "Culto") : "Todos os cultos fixos");
  const mostrar = (r: Retorno) => setMsg(r.erro ? { tipo: "erro", texto: r.erro } : r.aviso ? { tipo: "ok", texto: r.aviso } : null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/montar" className="text-sm text-neutral-500 underline">← Montar escala</Link>
      <h1 className="text-2xl font-semibold">Cultos fixos</h1>
      <p className="text-sm text-neutral-500">
        Defina em que dia e horário acontecem os cultos de toda semana. Para mudar só um culto específico, use “Alterar” ou “Cancelar” na tela Montar.
      </p>
      {msg && <p className={`text-sm ${msg.tipo === "erro" ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{msg.texto}</p>}

      {cultos.map((c) =>
        editando === c.id ? (
          <FormCulto
            key={c.id}
            inicial={{ id: c.id, nome: c.nome, diaSemana: c.diaSemana, hora: c.hora, aplicarFuturos: false }}
            rotulo="Salvar"
            aoEnviar={async (d) => {
              const r = await salvarCultoFixo(d);
              mostrar(r);
              return r;
            }}
            aoFechar={() => setEditando(null)}
          />
        ) : (
          <article key={c.id} className={`flex items-center justify-between gap-3 rounded-xl border border-neutral-300 p-3 dark:border-neutral-700 ${c.ativo ? "" : "opacity-50"}`}>
            <div>
              <p className="font-medium">{c.nome}</p>
              <p className="text-sm text-neutral-500">{DIAS_SEMANA[c.diaSemana]} · {c.hora}{c.ativo ? "" : " · desativado"}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
              <button onClick={() => setEditando(c.id)} className="text-violet-700 underline dark:text-violet-300">Editar</button>
              <button disabled={ocupado} onClick={() => iniciar(async () => mostrar(await alternarCultoFixo(c.id, !c.ativo)))} className="text-neutral-500 underline">
                {c.ativo ? "Desativar" : "Reativar"}
              </button>
            </div>
          </article>
        ),
      )}
      {cultos.length === 0 && <p className="text-neutral-500">Nenhum culto fixo cadastrado.</p>}

      {criando ? (
        <FormCulto
          inicial={{ nome: "", diaSemana: 0, hora: "19:30" }}
          rotulo="Criar culto fixo"
          aoEnviar={async (d) => {
            const r = await salvarCultoFixo(d);
            mostrar(r);
            return r;
          }}
          aoFechar={() => setCriando(false)}
        />
      ) : (
        <button onClick={() => setCriando(true)} className="h-11 rounded-xl border border-neutral-300 text-sm font-medium dark:border-neutral-700">+ Novo culto fixo</button>
      )}

      <h2 className="mt-4 text-xl font-semibold">Cultos que não vão acontecer</h2>
      <p className="text-sm text-neutral-500">Recesso, viagem, evento da igreja… Nesses dias os cultos não são gerados, e os que já estavam criados são removidos.</p>
      <FormPausa cultos={cultos.filter((c) => c.ativo)} aoAviso={setMsg} />
      {pausas.map((p) => (
        <article key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <div>
            <p className="font-medium">{p.de === p.ate ? dataBr(p.de) : `${dataBr(p.de)} a ${dataBr(p.ate)}`}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{nomeDe(p.tipo_evento_id)}{p.motivo ? ` · ${p.motivo}` : ""}</p>
          </div>
          <button disabled={ocupado} onClick={() => iniciar(async () => mostrar(await removerPausa(p.id)))} className="text-sm text-red-600 underline">Remover</button>
        </article>
      ))}
      {pausas.length === 0 && <p className="text-sm text-neutral-500">Nenhuma pausa registrada.</p>}
    </main>
  );
}
