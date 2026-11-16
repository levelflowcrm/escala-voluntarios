"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { salvarPerfil, type DadosPerfil } from "./acoes";
import { Aparencia } from "./aparencia";

const campo = "h-11 w-full rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

export function TelaPerfil({
  nome,
  email,
  inicial,
  ministerios,
  funcoes,
}: {
  nome: string;
  email: string;
  inicial: DadosPerfil;
  ministerios: { nome: string; coordenador: boolean }[];
  funcoes: { nome: string; area: string; apto: boolean }[];
}) {
  const [d, setD] = useState(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = (k: keyof DadosPerfil) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setD({ ...d, [k]: e.target.value });
    setMsg(null);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Meu perfil</h1>
      <p className="text-neutral-500">{nome}{email && ` · ${email}`}</p>

      <label className="flex flex-col gap-1 text-sm">
        Nome completo
        <input className={campo} value={d.nomeCompleto} onChange={set("nomeCompleto")} autoComplete="name" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Celular / WhatsApp
        <input className={campo} value={d.celular} onChange={set("celular")} inputMode="tel" placeholder="(11) 99999-9999" autoComplete="tel" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Aniversário
        <input className={campo} type="date" value={d.aniversario} onChange={set("aniversario")} />
      </label>
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvarPerfil(d);
            setMsg(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Salvo ✓" });
          })
        }
        className="h-12 rounded-xl bg-violet-600 font-medium text-white disabled:opacity-60"
      >
        {pendente ? "Salvando…" : "Salvar"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>{msg.texto}</p>}

      <Aparencia />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Onde eu sirvo</h2>
        {ministerios.length === 0 && <p className="text-neutral-500">Nenhum ministério ainda.</p>}
        {ministerios.map((m) => (
          <p key={m.nome}>{m.nome}{m.coordenador && <span className="ml-2 text-xs text-violet-600">coordenador(a)</span>}</p>
        ))}
        {funcoes.length > 0 && <h3 className="mt-2 text-sm font-medium text-neutral-500">Minhas habilidades</h3>}
        {[...new Set(funcoes.map((f) => f.area))].map((area) => (
          <p key={area} className="text-sm text-neutral-500">
            <strong className="text-neutral-700 dark:text-neutral-300">{area}:</strong>{" "}
            {funcoes.filter((f) => f.area === area).map((f) => (f.apto ? f.nome : `${f.nome} (aprendiz)`)).join(", ")}
          </p>
        ))}
        {funcoes.length > 0 && <p className="text-xs text-neutral-400">As habilidades são definidas pelo seu coordenador.</p>}
      </section>
    </main>
  );
}
