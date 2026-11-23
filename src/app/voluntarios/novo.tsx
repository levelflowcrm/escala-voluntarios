"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adicionarVoluntario } from "./acoes";
import type { AreaFuncoes } from "./habilidades";

const campo = "h-11 min-w-0 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700";

/** Formulário "Adicionar voluntário": nome, e-mail Google, celular, nascimento, ministério e funções iniciais. */
export function NovoVoluntario({ areas }: { areas: AreaFuncoes[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [aniversario, setAniversario] = useState("");
  const [ministerio, setMinisterio] = useState(areas[0]?.id ?? "");
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const area = areas.find((a) => a.id === ministerio);
  const alternar = (id: string) => setFuncoes((atual) => (atual.includes(id) ? atual.filter((f) => f !== id) : [...atual, id]));

  const salvar = () =>
    iniciar(async () => {
      setErro(null);
      setAviso(null);
      const r = await adicionarVoluntario({ nome, email, celular, aniversario, ministerio, funcoes });
      if (r.erro) return setErro(r.erro);
      setAviso(
        r.jaExistia
          ? `${r.nome} já estava cadastrado(a) com esse e-mail — agora também está no time de ${area?.nome}.`
          : `${r.nome} foi adicionado(a) ao time de ${area?.nome}.${email.trim() ? " No primeiro login com esse e-mail, a conta é vinculada." : " Cadastre o e-mail depois para ela(e) poder entrar."}`,
      );
      setNome("");
      setEmail("");
      setCelular("");
      setAniversario("");
      setFuncoes([]);
      router.refresh();
    });

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="h-11 rounded-lg bg-violet-600 px-4 font-medium text-white">
        + Adicionar voluntário
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-violet-400 p-4 dark:border-violet-600">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Novo voluntário</h2>
        <button onClick={() => setAberto(false)} className="text-sm text-neutral-500 underline">
          Fechar
        </button>
      </div>
      <input placeholder="Nome (como aparece na escala)" value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
      <input
        type="email"
        inputMode="email"
        autoCapitalize="none"
        placeholder="E-mail do Google (para entrar no app)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={campo}
      />
      <input type="tel" inputMode="tel" placeholder="Celular com DDD (WhatsApp)" value={celular} onChange={(e) => setCelular(e.target.value)} className={campo} />
      <label className="flex flex-col gap-1 text-sm text-neutral-500">
        Data de nascimento
        <input type="date" value={aniversario} min="1900-01-01" max={new Date().toISOString().slice(0, 10)} onChange={(e) => setAniversario(e.target.value)} className={`${campo} text-base text-inherit`} />
      </label>
      {areas.length > 1 && (
        <select
          value={ministerio}
          onChange={(e) => {
            setMinisterio(e.target.value);
            setFuncoes([]);
          }}
          className={campo}
        >
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      )}
      {area && area.funcoes.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm text-neutral-500">Funções em que já pode servir (opcional)</legend>
          <div className="flex flex-wrap gap-2">
            {area.funcoes.map((f) => (
              <label key={f.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${funcoes.includes(f.id) ? "border-violet-600 bg-violet-600 text-white" : "border-neutral-300 dark:border-neutral-700"}`}>
                <input type="checkbox" className="sr-only" checked={funcoes.includes(f.id)} onChange={() => alternar(f.id)} />
                {f.nome}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {aviso && <p className="text-sm text-emerald-700 dark:text-emerald-400">{aviso}</p>}
      <button disabled={pendente || !nome.trim() || !celular.trim() || !aniversario || !ministerio} onClick={salvar} className="h-11 rounded-lg bg-violet-600 px-4 font-medium text-white disabled:opacity-40">
        {pendente ? "Salvando…" : "Adicionar ao time"}
      </button>
    </section>
  );
}
