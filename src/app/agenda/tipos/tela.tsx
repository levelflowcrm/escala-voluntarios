"use client";

import { useState, useTransition } from "react";
import { CORES } from "@/lib/cores-evento";
import type { TipoEvento } from "@/lib/tipos-evento";
import { SeletorCor } from "../../seletor-cor";
import { alternarTipoEvento, criarTipoEvento, editarTipoEvento } from "./acoes";

const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

function Formulario({
  nomeInicial,
  corInicial,
  rotulo,
  aoEnviar,
  aoFechar,
}: {
  nomeInicial: string;
  corInicial: string;
  rotulo: string;
  aoEnviar: (nome: string, cor: string) => Promise<{ erro: string | null }>;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [cor, setCor] = useState(corInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
      <input className={campo} placeholder="Nome do tipo (ex.: Noite de Unção)" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
      <SeletorCor valor={cor} aoMudar={setCor} rotulo="Cor padrão dos eventos deste tipo" />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          disabled={ocupado}
          onClick={() =>
            iniciar(async () => {
              const r = await aoEnviar(nome, cor);
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

export function TelaTipos({ tipos }: { tipos: TipoEvento[] }) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  return (
    <>
      {!criando && (
        <button onClick={() => setCriando(true)} className="h-12 rounded-xl bg-violet-600 font-medium text-white">+ Novo tipo</button>
      )}
      {criando && <Formulario nomeInicial="" corInicial="" rotulo="Criar tipo" aoEnviar={criarTipoEvento} aoFechar={() => setCriando(false)} />}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {tipos.map((t) =>
        editando === t.id ? (
          <Formulario
            key={t.id}
            nomeInicial={t.nome}
            corInicial={t.cor ?? ""}
            rotulo="Salvar"
            aoEnviar={(nome, cor) => editarTipoEvento(t.id, nome, cor)}
            aoFechar={() => setEditando(null)}
          />
        ) : (
          <article key={t.id} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${t.cor && CORES[t.cor] ? CORES[t.cor].card : "border-neutral-300 dark:border-neutral-700"} ${t.ativo ? "" : "opacity-60"}`}>
            <div>
              <p className="font-medium">{t.nome}</p>
              <p className="text-xs text-neutral-500">{t.ativo ? (t.cor && CORES[t.cor] ? `Cor padrão: ${CORES[t.cor].nome}` : "Sem cor padrão") : "Inativo (não aparece em novos eventos)"}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditando(t.id)} className="text-neutral-600 underline dark:text-neutral-300">Editar</button>
              <button
                disabled={ocupado}
                onClick={() => iniciar(async () => setErro((await alternarTipoEvento(t.id, !t.ativo)).erro))}
                className="text-neutral-600 underline dark:text-neutral-300"
              >
                {t.ativo ? "Desativar" : "Reativar"}
              </button>
            </div>
          </article>
        ),
      )}
    </>
  );
}
