"use client";

import { useState, useTransition } from "react";
import { fmtDataHora } from "@/lib/datas";
import { definirTitular, gerarCultos, publicar, sugerir } from "./acoes";

export type EventoGrade = {
  id: string;
  titulo: string;
  inicio: string;
  passado: boolean;
  reuniao: boolean;
  situacao: "vazio" | "rascunho" | "publicada";
  responsavel: { nome: string; status: string } | null;
  vagas: {
    funcaoId: string;
    funcao: string;
    pessoaId: string | null;
    status: string | null;
    recusas: { nome: string; motivo: string | null }[];
  }[];
  extras: { nome: string; papel: string; funcao: string }[];
};

const SIMBOLO: Record<string, { s: string; t: string; c: string }> = {
  pendente: { s: "⏳", t: "Aguardando resposta", c: "text-amber-600" },
  confirmado: { s: "✓", t: "Confirmado", c: "text-emerald-600" },
};

const SITUACAO = {
  vazio: { t: "Sem escala", c: "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400" },
  rascunho: { t: "Rascunho", c: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  publicada: { t: "Publicada", c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};

export function Grade({
  ministerioId,
  mes,
  eventos,
  aptos,
}: {
  ministerioId: string;
  mes: string;
  eventos: EventoGrade[];
  aptos: Record<string, { id: string; nome: string }[]>;
}) {
  const [ocupado, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [mostrarPassados, setMostrarPassados] = useState(false);

  const rodar = (acao: () => Promise<{ erro: string | null; aviso?: string }>) =>
    iniciar(async () => {
      const r = await acao();
      setMensagem(r.erro ? { tipo: "erro", texto: r.erro } : r.aviso ? { tipo: "ok", texto: r.aviso } : null);
    });

  const rascunhos = eventos.filter((e) => e.situacao === "rascunho").length;
  const vagasAbertas = eventos
    .filter((e) => !e.passado && !e.reuniao && !e.responsavel)
    .reduce((n, e) => n + e.vagas.filter((v) => !v.pessoaId).length, 0);
  const passados = eventos.filter((e) => e.passado).length;
  const visiveis = mostrarPassados ? eventos : eventos.filter((e) => !e.passado);

  const botao = "h-11 rounded-xl px-4 text-sm font-medium disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button disabled={ocupado} onClick={() => rodar(() => gerarCultos(mes))} className={`${botao} border border-neutral-300 dark:border-neutral-700`}>
          Criar cultos fixos do mês
        </button>
        <button
          disabled={ocupado || vagasAbertas === 0}
          onClick={() => rodar(() => sugerir(ministerioId, mes))}
          className={`${botao} border border-violet-400 text-violet-700 dark:text-violet-300`}
        >
          Sugerir {vagasAbertas > 0 ? `${vagasAbertas} vagas vazias` : "vagas"}
        </button>
        <button
          disabled={ocupado || rascunhos === 0}
          onClick={() => {
            if (confirm(`Publicar ${rascunhos} eventos? Os voluntários passam a ver e a confirmar.`))
              rodar(() => publicar(ministerioId, mes));
          }}
          className={`${botao} bg-violet-600 text-white`}
        >
          Publicar{rascunhos > 0 && ` (${rascunhos})`}
        </button>
      </div>

      {ocupado && <p className="text-sm text-neutral-500">Salvando...</p>}
      {mensagem && (
        <p className={`rounded-xl p-3 text-sm ${mensagem.tipo === "erro" ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"}`}>
          {mensagem.texto}
        </p>
      )}

      {passados > 0 && (
        <button onClick={() => setMostrarPassados(!mostrarPassados)} className="self-start text-sm text-neutral-500 underline">
          {mostrarPassados ? "Esconder" : "Mostrar"} {passados} eventos que já passaram
        </button>
      )}

      {visiveis.length === 0 && (
        <p className="text-neutral-500">Nenhum evento neste mês. Use “Criar cultos fixos do mês” para começar.</p>
      )}

      {visiveis.map((e) => {
        const sit = SITUACAO[e.situacao];
        return (
          <article key={e.id} className={`rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 ${e.passado ? "opacity-60" : ""}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium capitalize">{fmtDataHora.format(new Date(e.inicio))}</p>
                <p className="text-sm text-neutral-500">{e.titulo}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${sit.c}`}>{sit.t}</span>
            </div>

            {e.reuniao ? (
              <p className="text-sm text-neutral-500">Convocação geral: todos são chamados.</p>
            ) : e.responsavel ? (
              <p className="text-sm">
                Responsável do dia: <strong>{e.responsavel.nome}</strong>{" "}
                <span className={SIMBOLO[e.responsavel.status]?.c}>{SIMBOLO[e.responsavel.status]?.s}</span>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {e.vagas.map((v) => {
                  const sim = v.status ? SIMBOLO[v.status] : null;
                  return (
                    <div key={v.funcaoId}>
                      <label className="flex items-center gap-2">
                        <span className="w-32 shrink-0 text-sm text-neutral-500">{v.funcao}</span>
                        <select
                          disabled={ocupado || e.passado}
                          value={v.pessoaId ?? ""}
                          onChange={(ev) => rodar(() => definirTitular(ministerioId, e.id, v.funcaoId, ev.target.value || null))}
                          className={`h-10 min-w-0 flex-1 rounded-lg border bg-transparent px-2 text-sm ${v.pessoaId ? "border-neutral-300 dark:border-neutral-700" : "border-dashed border-amber-400"}`}
                        >
                          <option value="">— vaga aberta —</option>
                          {(aptos[v.funcaoId] ?? []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                        <span title={sim?.t} className={`w-5 text-center ${sim?.c ?? ""}`}>
                          {sim?.s}
                        </span>
                      </label>
                      {v.recusas.map((r, i) => (
                        <p key={i} className="mt-0.5 pl-34 text-xs text-red-600">
                          {r.nome} não pode{r.motivo ? `: ${r.motivo}` : ""}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {e.extras.length > 0 && (
              <p className="mt-2 text-xs text-neutral-500">
                {e.extras.map((x) => `${x.nome} (${x.papel === "apoio" ? "apoio" : "treinamento"} · ${x.funcao})`).join(", ")}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
