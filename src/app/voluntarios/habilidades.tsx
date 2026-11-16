"use client";

import { useState, useTransition } from "react";
import { definirHabilidade, type NivelHab } from "./acoes";

export type AreaFuncoes = { id: string; nome: string; funcoes: { id: string; nome: string }[] };

const OPCOES: { valor: NivelHab; texto: string }[] = [
  { valor: "nenhuma", texto: "Não" },
  { valor: "aprendiz", texto: "Aprendiz" },
  { valor: "apto", texto: "Apto" },
];

/** Habilidades: em quais áreas/funções a pessoa pode servir e com que nível. */
export function Habilidades({
  pessoaId,
  areas,
  inicial,
}: {
  pessoaId: string;
  areas: AreaFuncoes[];
  inicial: Record<string, NivelHab>;
}) {
  const [niveis, setNiveis] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const mudar = (funcaoId: string, nivel: NivelHab) =>
    iniciar(async () => {
      const r = await definirHabilidade(pessoaId, funcaoId, nivel);
      if (r.erro) return setErro(r.erro);
      setErro(null);
      setNiveis((n) => ({ ...n, [funcaoId]: nivel }));
    });

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">
        Marque onde esta pessoa pode servir. “Apto” entra na sugestão automática; “Aprendiz” só aparece quando você
        escala manualmente. Ao marcar uma função, a pessoa entra no time daquela área.
      </p>
      {areas.map((a) => (
        <div key={a.id} className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">{a.nome}</p>
          {a.funcoes.length === 0 && <p className="text-xs text-neutral-500">Esta área ainda não tem funções cadastradas.</p>}
          {a.funcoes.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{f.nome}</span>
              <div className="flex rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-900">
                {OPCOES.map((o) => (
                  <button
                    key={o.valor}
                    disabled={ocupado}
                    onClick={() => mudar(f.id, o.valor)}
                    className={`h-8 rounded-md px-2.5 text-xs font-medium disabled:opacity-60 ${
                      (niveis[f.id] ?? "nenhuma") === o.valor ? "bg-white shadow-sm dark:bg-neutral-700" : "text-neutral-500"
                    }`}
                  >
                    {o.texto}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
