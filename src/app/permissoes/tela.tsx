"use client";

import { useState, useTransition } from "react";
import { definirAdmin, definirCoordenador } from "./acoes";

export type PessoaPerm = {
  pessoa_id: string;
  nome: string;
  email: string | null;
  conectado: boolean;
  admin: boolean;
  master: boolean;
  coordena: string[];
  times: { ministerioId: string; papel: string }[];
};

/** O que a pessoa é no app, do maior poder para o menor. */
function funcaoNoApp(p: PessoaPerm): string {
  if (p.master) return "Administrador master";
  if (p.admin) return "Administrador";
  if (p.coordena.length > 0) return "Facilitador";
  return p.times.length > 0 ? "Voluntário" : "Sem time";
}

function Chave({ ligado, rotulo, desabilitado, aoMudar }: { ligado: boolean; rotulo: string; desabilitado?: boolean; aoMudar: () => void }) {
  return (
    <button
      type="button"
      disabled={desabilitado}
      onClick={aoMudar}
      aria-pressed={ligado}
      className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
        ligado ? "bg-violet-600 text-white" : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
      }`}
    >
      {ligado ? "✓ " : ""}{rotulo}
    </button>
  );
}

export function TelaPermissoes({
  pessoas,
  ministerios,
  souMaster,
  euId,
}: {
  pessoas: PessoaPerm[];
  ministerios: { id: string; nome: string }[];
  souMaster: boolean;
  euId: string;
}) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const rodar = (acao: () => Promise<{ erro?: string }>) =>
    iniciar(async () => setErro((await acao()).erro ?? null));

  return (
    <>
      {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</p>}
      {pessoas.map((p) => (
        <article key={p.pessoa_id} className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
          <div>
            <p className="font-medium">
              {p.nome}
              {p.master && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">master</span>}
            </p>
            <p className="text-sm text-neutral-500">{p.email ?? "sem e-mail"}{!p.conectado && " · ainda não entrou"}</p>
            <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-300">{funcaoNoApp(p)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-neutral-500">Times:</span>
            {p.times.length === 0 && <span className="text-neutral-500">nenhum (não pode ser escalado)</span>}
            {p.times
              .map((x) => ({ ...x, nome: ministerios.find((m) => m.id === x.ministerioId)?.nome ?? "" }))
              .filter((x) => x.nome)
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((x) => (
                <span
                  key={x.ministerioId}
                  className={`rounded-full px-2 py-0.5 ${
                    x.papel === "coordenador"
                      ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {x.nome}{x.papel === "coordenador" ? " · facilita" : ""}
                </span>
              ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Chave
              rotulo="Administrador"
              ligado={p.admin}
              desabilitado={ocupado || !souMaster || p.master || p.pessoa_id === euId}
              aoMudar={() => {
                if (confirm(p.admin ? `Remover ${p.nome} de administrador?` : `Tornar ${p.nome} administrador? Terá acesso total.`))
                  rodar(() => definirAdmin(p.pessoa_id, !p.admin));
              }}
            />
            {ministerios.map((m) => (
              <Chave
                key={m.id}
                rotulo={`Facilita ${m.nome}`}
                ligado={p.coordena.includes(m.id)}
                desabilitado={ocupado}
                aoMudar={() => rodar(() => definirCoordenador(p.pessoa_id, m.id, !p.coordena.includes(m.id)))}
              />
            ))}
          </div>
        </article>
      ))}
    </>
  );
}
