"use client";

import { useCallback, useEffect, useState } from "react";
import type { DadosDisponibilidade } from "@/lib/disponibilidade-dados";
import { PainelDisponibilidade } from "../disponibilidade/tela";
import { carregarDisponibilidade, type EscalaProxima } from "./acoes";

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Disponibilidade do voluntário vista (e ajustada) pelo facilitador. */
export function DisponibilidadeDoVoluntario({ pessoaId, nome }: { pessoaId: string; nome: string }) {
  const [dados, setDados] = useState<DadosDisponibilidade | null>(null);
  const [proximas, setProximas] = useState<EscalaProxima[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await carregarDisponibilidade(pessoaId);
    if (r.erro || !r.dados) return setErro(r.erro ?? "Não foi possível carregar");
    setErro(null);
    setDados(r.dados);
    setProximas(r.proximas ?? []);
  }, [pessoaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) return <p className="text-sm text-red-600">{erro}</p>;
  if (!dados) return <p className="text-sm text-neutral-500">Carregando…</p>;

  const primeiro = nome.split(" ")[0];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-neutral-500">
        É a mesma disponibilidade que {primeiro} vê no próprio perfil. O que você mudar aqui vale para a sugestão automática e para as vagas.
        {dados.limite ? ` Limite: ${dados.limite} por mês.` : ""}
        {dados.observacao ? ` Recado: “${dados.observacao}”` : ""}
      </p>
      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-neutral-500">Próximas escalas de {primeiro}</h3>
        {proximas.length === 0 && <p className="text-sm text-neutral-500">Nenhuma escala futura.</p>}
        {proximas.map((e, i) => (
          <p key={i} className="text-sm">
            <span className="text-neutral-500">{fmt.format(new Date(e.quando))}</span> · {e.evento}
            <span className="text-neutral-500">
              {" "}
              · {e.ministerio}
              {e.funcao ? ` (${e.funcao})` : ""}
              {e.status === "pendente" ? " · aguardando resposta" : ""}
            </span>
          </p>
        ))}
      </section>
      <PainelDisponibilidade dados={dados} pessoaId={pessoaId} sujeito={primeiro} aoSalvar={() => void carregar()} />
    </div>
  );
}
