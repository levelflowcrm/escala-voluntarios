"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Periodo } from "@/lib/escala/sugerir";
import { nomeTurno } from "@/lib/turnos";
import { Preferencias } from "./preferencias";
import { adicionarBloqueio, confirmarDisponibilidade, removerBloqueio, salvarTurno, type Atalho } from "./acoes";
import { Atalhos, Calendario } from "./calendario";

export type RegraTurno = "sempre" | "nunca" | number[];

const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
const dia = (d: string) => fmtDia.format(new Date(`${d}T12:00:00Z`));

function CartaoTurno({
  turno,
  ocupado,
  rodar,
}: {
  turno: { diaSemana: number; periodo: Periodo; cultos: string[]; regra: RegraTurno };
  ocupado: boolean;
  rodar: (acao: () => Promise<{ erro: string | null }>) => void;
}) {
  const tipo = Array.isArray(turno.regra) ? "algumas" : turno.regra;
  // "Algumas semanas" sem nenhuma marcada ainda é só um estado da tela.
  const [mostrarSemanas, setMostrarSemanas] = useState(tipo === "algumas");
  const ordens = Array.isArray(turno.regra) ? turno.regra : [];
  const salvar = (regra: RegraTurno) => rodar(() => salvarTurno(turno.diaSemana, turno.periodo, regra));
  const atual = mostrarSemanas ? "algumas" : tipo;

  const opcao = (valor: string, texto: string, ao: () => void) => (
    <button
      disabled={ocupado}
      onClick={ao}
      className={`h-10 flex-1 rounded-lg text-sm font-medium disabled:opacity-60 ${atual === valor ? "bg-white shadow-sm dark:bg-neutral-700" : "text-neutral-500"}`}
    >
      {texto}
    </button>
  );

  return (
    <article className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="font-medium">{nomeTurno(turno)}</p>
      <p className="mb-3 text-sm text-neutral-500">{turno.cultos.join(", ")}</p>
      <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
        {opcao("sempre", "Posso", () => {
          setMostrarSemanas(false);
          salvar("sempre");
        })}
        {opcao("algumas", "Às vezes", () => setMostrarSemanas(true))}
        {opcao("nunca", "Não posso", () => {
          setMostrarSemanas(false);
          salvar("nunca");
        })}
      </div>
      {mostrarSemanas && (
        <div className="mt-3">
          <p className="mb-2 text-sm text-neutral-500">Marque as semanas do mês em que você não pode:</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((o) => {
              const marcado = ordens.includes(o);
              return (
                <button
                  key={o}
                  disabled={ocupado}
                  onClick={() => salvar(marcado ? ordens.filter((x) => x !== o) : [...ordens, o])}
                  className={`h-10 flex-1 rounded-lg border text-sm font-medium disabled:opacity-60 ${marcado ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300" : "border-neutral-300 dark:border-neutral-700"}`}
                >
                  {o}º
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

export function TelaDisponibilidade({
  turnos,
  bloqueios,
  hoje,
  limite,
  observacao,
  atalho,
  marcados,
  diasComEvento,
  soDiasMarcados,
  mesParaConfirmar = null,
}: {
  turnos: { diaSemana: number; periodo: Periodo; cultos: string[]; regra: RegraTurno }[];
  bloqueios: { id: string; inicio: string; fim: string; motivo: string | null }[];
  hoje: string;
  limite: number | null;
  observacao: string;
  atalho: Atalho | null;
  marcados: string[];
  diasComEvento: string[];
  soDiasMarcados: boolean;
  mesParaConfirmar?: string | null;
}) {
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState({ inicio: "", fim: "", motivo: "" });

  const rodar = (acao: () => Promise<{ erro: string | null }>, depois?: () => void) =>
    iniciar(async () => {
      const r = await acao();
      setErro(r.erro);
      if (!r.erro) depois?.();
    });

  const campo = "h-11 rounded-xl border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <Link href="/perfil" className="text-sm text-neutral-500">
          ← Perfil
        </Link>
        <h1 className="text-2xl font-semibold">Minha disponibilidade</h1>
        <p className="text-sm text-neutral-500">
          O facilitador só sugere você nos dias em que você pode. Mudou algo? É só ajustar aqui.
        </p>
      </header>

      {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{erro}</p>}

      {mesParaConfirmar && (
        <section className="flex flex-col gap-2 rounded-xl border border-violet-300 p-3 dark:border-violet-800">
          <p className="text-sm">
            Você ainda não informou sua disponibilidade de <strong>{mesParaConfirmar}</strong>. Se pode servir normalmente, é só confirmar; se não, ajuste abaixo.
          </p>
          <button
            disabled={ocupado}
            onClick={() => rodar(confirmarDisponibilidade)}
            className="h-11 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
          >
            Está tudo certo para {mesParaConfirmar}
          </button>
        </section>
      )}

      <Atalhos key={atalho ?? "personalizado"} atual={atalho} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Cultos de toda semana</h2>
        {turnos.map((t) => (
          <CartaoTurno key={`${t.diaSemana}|${t.periodo}`} turno={t} ocupado={ocupado} rodar={rodar} />
        ))}
      </section>

      <Calendario hoje={hoje} marcados={marcados} diasComEvento={diasComEvento} soDiasMarcados={soDiasMarcados} />

      <Preferencias limite={limite} observacao={observacao} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Viagens e ausências</h2>
        {bloqueios.length === 0 && <p className="text-sm text-neutral-500">Nenhuma ausência marcada.</p>}
        {bloqueios.map((b) => (
          <article key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div>
              <p className="font-medium">{b.inicio === b.fim ? dia(b.inicio) : `${dia(b.inicio)} a ${dia(b.fim)}`}</p>
              {b.motivo && <p className="text-sm text-neutral-500">{b.motivo}</p>}
            </div>
            <button disabled={ocupado} onClick={() => rodar(() => removerBloqueio(b.id))} className="text-sm text-red-600 underline disabled:opacity-50">
              Remover
            </button>
          </article>
        ))}

        <form
          className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700"
          onSubmit={(e) => {
            e.preventDefault();
            rodar(() => adicionarBloqueio(novo.inicio, novo.fim || novo.inicio, novo.motivo), () =>
              setNovo({ inicio: "", fim: "", motivo: "" }),
            );
          }}
        >
          <p className="font-medium">Adicionar ausência</p>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-500">
              De
              <input type="date" required min={hoje} value={novo.inicio} onChange={(e) => setNovo({ ...novo, inicio: e.target.value })} className={campo} />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-500">
              Até
              <input type="date" min={novo.inicio || hoje} value={novo.fim} onChange={(e) => setNovo({ ...novo, fim: e.target.value })} className={campo} />
            </label>
          </div>
          <input placeholder="Motivo (opcional): viagem, plantão..." value={novo.motivo} onChange={(e) => setNovo({ ...novo, motivo: e.target.value })} className={campo} />
          <button disabled={ocupado} className="h-11 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-50">
            {ocupado ? "Salvando..." : "Adicionar"}
          </button>
        </form>
      </section>
    </main>
  );
}
