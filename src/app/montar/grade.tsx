"use client";

import { useState, useTransition } from "react";
import { CORES } from "@/lib/cores-evento";
import { diaNoFuso, fmtDataHora } from "@/lib/datas";
import { SeletorCor } from "../seletor-cor";
import { alterarCulto, cancelarCulto, criarAutomatico, definirCorEvento, definirTitular, dispensarEvento, gerarCultos, publicar, sugerir } from "./acoes";

export type EventoGrade = {
  id: string;
  titulo: string;
  inicio: string;
  cor: string | null;
  passado: boolean;
  reuniao: boolean;
  /** pessoaId → nome do ministério que já escalou essa pessoa neste evento */
  ocupados: Record<string, string>;
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
  dispensados,
  master,
}: {
  ministerioId: string;
  mes: string;
  eventos: EventoGrade[];
  aptos: Record<string, { id: string; nome: string }[]>;
  dispensados: { id: string; titulo: string; inicio: string }[];
  master: boolean;
}) {
  const [ocupado, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [mostrarPassados, setMostrarPassados] = useState(false);
  const [corAberta, setCorAberta] = useState<string | null>(null);
  const [alterando, setAlterando] = useState<{ id: string; dia: string; hora: string } | null>(null);
  const horaFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

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
      <button
        disabled={ocupado}
        onClick={() => {
          if (confirm(master ? "Criar automático: cria os cultos do mês e preenche as vagas vazias respeitando disponibilidade, conflitos com outros ministérios e a divisão da carga. Nada é publicado. Continuar?" : "Criar automático: preenche as vagas vazias respeitando disponibilidade, conflitos com outros ministérios e a divisão da carga. Nada é publicado. Continuar?"))
            rodar(() => criarAutomatico(ministerioId, mes));
        }}
        className={`${botao} w-full bg-violet-600 text-white`}
      >
        ✨ Criar automático
      </button>
      <div className="flex flex-wrap gap-2">
        {master && (
          <button disabled={ocupado} onClick={() => rodar(() => gerarCultos(mes))} className={`${botao} border border-neutral-300 dark:border-neutral-700`}>
            Criar cultos fixos do mês
          </button>
        )}
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
        <p className="text-neutral-500">{master ? "Nenhum evento neste mês. Use “Criar cultos fixos do mês” ou cadastre eventos na Agenda da igreja." : "Nenhum evento neste mês para o seu ministério. Os eventos são cadastrados pelo administrador na Agenda da igreja."}</p>
      )}

      {visiveis.map((e) => {
        const sit = SITUACAO[e.situacao];
        return (
          <article key={e.id} className={`rounded-xl border p-4 ${e.cor && CORES[e.cor] ? CORES[e.cor].card : "border-neutral-200 dark:border-neutral-800"} ${e.passado ? "opacity-60" : ""}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium capitalize">{fmtDataHora.format(new Date(e.inicio))}</p>
                <p className="text-sm text-neutral-500">{e.titulo}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                  {master && <button onClick={() => setCorAberta(corAberta === e.id ? null : e.id)} className="underline">🎨 Cor</button>}
                  {master && (
                    <button
                      onClick={() => setAlterando({ id: e.id, dia: diaNoFuso(new Date(e.inicio)), hora: horaFmt.format(new Date(e.inicio)) })}
                      className="underline"
                    >
                      ✏️ Alterar dia/horário
                    </button>
                  )}
                  {!e.passado && (
                    <button
                      disabled={ocupado}
                      onClick={() => {
                        if (confirm(`Dispensar “${e.titulo}” para o seu ministério? Ele sai da sua escala (as outras áreas não mudam) e você pode voltar atrás.`))
                          rodar(() => dispensarEvento(e.id, ministerioId, true));
                      }}
                      className="underline"
                    >
                      🚫 Meu time não serve neste evento
                    </button>
                  )}
                  {master && <button
                    disabled={ocupado}
                    onClick={() => {
                      const escalados = e.vagas.filter((v) => v.pessoaId).length;
                      const aviso = escalados > 0 ? ` ${escalados} pessoa(s) escalada(s) neste ministério serão tiradas dele.` : "";
                      const motivo = prompt(`Cancelar “${e.titulo}”?${aviso} Motivo (opcional):`);
                      if (motivo !== null) rodar(() => cancelarCulto(e.id, motivo));
                    }}
                    className="text-red-600 underline"
                  >
                    Cancelar culto
                  </button>}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${sit.c}`}>{sit.t}</span>
            </div>

            {alterando?.id === e.id && (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-violet-300 p-3 dark:border-violet-800">
                <p className="text-xs text-neutral-500">Vale só para este culto. Quem já está escalado continua escalado.</p>
                <div className="flex gap-2">
                  <input type="date" value={alterando.dia} onChange={(ev) => setAlterando({ ...alterando, dia: ev.target.value })} className="h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700" />
                  <input type="time" step={300} value={alterando.hora} onChange={(ev) => setAlterando({ ...alterando, hora: ev.target.value })} className="h-11 max-w-32 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700" />
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={ocupado}
                    onClick={() => {
                      rodar(() => alterarCulto(e.id, alterando.dia, alterando.hora));
                      setAlterando(null);
                    }}
                    className="h-10 flex-1 rounded-lg bg-violet-600 text-sm font-medium text-white"
                  >
                    Salvar
                  </button>
                  <button onClick={() => setAlterando(null)} className="h-10 rounded-lg border border-neutral-300 px-4 text-sm dark:border-neutral-700">Cancelar</button>
                </div>
              </div>
            )}

            {corAberta === e.id && (
              <div className="mb-3">
                <SeletorCor valor={e.cor ?? ""} aoMudar={(cor) => rodar(() => definirCorEvento(e.id, cor))} />
              </div>
            )}

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
                          {(aptos[v.funcaoId] ?? []).map((p) => {
                            const outro = e.ocupados[p.id];
                            const jaEscalado = !!outro && p.id !== v.pessoaId;
                            return (
                              <option key={p.id} value={p.id} disabled={jaEscalado}>
                                {p.nome}
                                {jaEscalado ? ` — já escalado em ${outro}` : ""}
                              </option>
                            );
                          })}
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

      {dispensados.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
          <h2 className="text-sm font-medium">Dispensados pelo seu ministério ({dispensados.length})</h2>
          <p className="text-xs text-neutral-500">Esses eventos não entram na escala do seu time. Se mudar de ideia, é só voltar a escalar.</p>
          {dispensados.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="capitalize">{fmtDataHora.format(new Date(d.inicio))}</span> · {d.titulo}
              </span>
              <button disabled={ocupado} onClick={() => rodar(() => dispensarEvento(d.id, ministerioId, false))} className="shrink-0 text-violet-700 underline dark:text-violet-300">
                Voltar a escalar
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
