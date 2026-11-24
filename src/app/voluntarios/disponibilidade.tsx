"use client";

import { useEffect, useState } from "react";
import type { DadosDisponibilidade } from "@/lib/disponibilidade-dados";
import { nomeTurno } from "@/lib/turnos";
import { carregarDisponibilidade, type EscalaProxima } from "./acoes";

const fmtEscala = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const dia = (d: string) => fmtDia.format(new Date(`${d}T12:00:00Z`));

function Linha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-neutral-500">{titulo}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/** Resumo (somente leitura) da disponibilidade do voluntário. Quem edita é o próprio voluntário. */
export function DisponibilidadeDoVoluntario({ pessoaId, nome }: { pessoaId: string; nome: string }) {
  const [dados, setDados] = useState<DadosDisponibilidade | null>(null);
  const [proximas, setProximas] = useState<EscalaProxima[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarDisponibilidade(pessoaId).then((r) => {
      if (!ativo) return;
      if (r.erro || !r.dados) return setErro(r.erro ?? "Não foi possível carregar");
      setDados(r.dados);
      setProximas(r.proximas ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [pessoaId]);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!dados) return <p className="text-sm text-neutral-500">Carregando…</p>;

  const primeiro = nome.split(" ")[0];
  const pode = dados.turnos.filter((t) => t.regra === "sempre");
  const nao = dados.turnos.filter((t) => t.regra === "nunca");
  const asVezes = dados.turnos.filter((t) => Array.isArray(t.regra));
  const lista = (ts: typeof dados.turnos) => ts.map((t) => nomeTurno(t)).join(", ");

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">
        Só {primeiro} altera a própria disponibilidade (em Perfil). A disponibilidade vale para todos os times em que {primeiro} serve.
      </p>

      <Linha titulo="Cultos de toda semana">
        {dados.turnos.length === 0 && <span className="text-neutral-500">Sem cultos fixos cadastrados.</span>}
        {pode.length > 0 && <p><span className="text-emerald-700 dark:text-emerald-400">Pode:</span> {lista(pode)}</p>}
        {asVezes.length > 0 && (
          <p>
            <span className="text-amber-700 dark:text-amber-400">Às vezes:</span>{" "}
            {asVezes.map((t) => `${nomeTurno(t)} (não pode no ${(t.regra as number[]).map((o) => `${o}º`).join(", ")})`).join("; ")}
          </p>
        )}
        {nao.length > 0 && <p><span className="text-red-600">Não pode:</span> {lista(nao)}</p>}
      </Linha>

      {dados.soDiasMarcados && (
        <Linha titulo="Atenção">
          <span className="text-amber-700 dark:text-amber-400">Só serve nos dias que marca no calendário</span>
        </Linha>
      )}

      <Linha titulo="Dias marcados como disponível">
        {dados.marcados.length === 0 ? (
          <span className="text-neutral-500">Nenhum dia marcado.</span>
        ) : (
          [...dados.marcados].sort().map(dia).join(", ")
        )}
      </Linha>

      <Linha titulo="Viagens e ausências">
        {dados.bloqueios.length === 0 ? (
          <span className="text-neutral-500">Nenhuma ausência marcada.</span>
        ) : (
          dados.bloqueios.map((b) => (
            <p key={b.id}>
              {b.inicio === b.fim ? dia(b.inicio) : `${dia(b.inicio)} a ${dia(b.fim)}`}
              {b.motivo ? <span className="text-neutral-500"> · {b.motivo}</span> : null}
            </p>
          ))
        )}
      </Linha>

      <Linha titulo="Preferências">
        <p>{dados.limite ? `No máximo ${dados.limite} ${dados.limite === 1 ? "vez" : "vezes"} por mês` : "Sem limite por mês"}</p>
        {dados.observacao && <p className="text-neutral-500">Recado: “{dados.observacao}”</p>}
      </Linha>

      <Linha titulo="Próximas escalas">
        {proximas.length === 0 && <span className="text-neutral-500">Nenhuma escala futura.</span>}
        {proximas.map((e, i) => (
          <p key={i}>
            <span className="text-neutral-500">{fmtEscala.format(new Date(e.quando))}</span> · {e.evento}
            <span className="text-neutral-500">
              {" "}· {e.ministerio}
              {e.funcao ? ` (${e.funcao})` : ""}
              {e.status === "pendente" ? " · aguardando resposta" : ""}
            </span>
          </p>
        ))}
      </Linha>
    </div>
  );
}
