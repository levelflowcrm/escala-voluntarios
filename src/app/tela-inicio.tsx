import Link from "next/link";
import { fmtDataHora } from "@/lib/datas";
import { sair } from "./acoes";
import { Resposta } from "./resposta";

const PAPEL: Record<string, string> = {
  titular: "",
  apoio: "apoio",
  treinamento: "treinamento",
  responsavel_dia: "responsável do dia",
};

const STATUS: Record<string, { texto: string; classe: string }> = {
  pendente: { texto: "Aguardando você", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  confirmado: { texto: "Confirmado", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  recusado: { texto: "Não posso", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  trocado: { texto: "Trocado", classe: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
};

export type Linha = {
  id: string;
  papel: string;
  status: string;
  motivo: string | null;
  eventos: { titulo: string; inicio: string };
  funcoes: { nome: string } | null;
  ministerios: { nome: string } | null;
};

/** Parte visual da tela inicial (Minhas escalas). */
export function TelaInicio({
  nome,
  coordenador,
  proximas,
  historico,
}: {
  nome: string;
  coordenador: boolean;
  proximas: Linha[];
  historico: Linha[];
}) {
  const aguardando = proximas.filter((e) => e.status === "pendente").length;

  const cartao = (e: Linha, comResposta: boolean) => {
    const s = STATUS[e.status];
    const papel = PAPEL[e.papel];
    return (
      <article key={e.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium capitalize">{fmtDataHora.format(new Date(e.eventos.inicio))}</p>
            <p className="text-sm text-neutral-500">
              {e.eventos.titulo} · {e.funcoes?.nome ?? e.ministerios?.nome}
              {papel && ` (${papel})`}
            </p>
            {e.status === "recusado" && e.motivo && <p className="mt-1 text-xs text-neutral-400">Motivo: {e.motivo}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.classe}`}>{s.texto}</span>
        </div>
        {comResposta && <Resposta escalaId={e.id} status={e.status} />}
      </article>
    );
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">Igreja Nasci Pra Deus</p>
          <h1 className="text-2xl font-semibold">Olá, {nome} 👋</h1>
          {aguardando > 0 && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {aguardando === 1 ? "1 escala espera" : `${aguardando} escalas esperam`} sua confirmação.
            </p>
          )}
        </div>
        <form action={sair}>
          <button className="text-sm text-neutral-500 underline">Sair</button>
        </form>
      </header>

      {coordenador && (
        <Link
          href="/montar"
          className="flex h-12 items-center justify-center rounded-xl bg-violet-600 font-medium text-white"
        >
          Montar escala
        </Link>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Minhas próximas escalas</h2>
        {proximas.length === 0 && (
          <p className="text-neutral-500">Nenhuma escala marcada. Quando o coordenador publicar, ela aparece aqui.</p>
        )}
        {proximas.map((e) => cartao(e, true))}
      </section>

      {historico.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-500">Últimas que você serviu</h2>
          {historico.map((e) => cartao(e, false))}
        </section>
      )}
    </main>
  );
}
