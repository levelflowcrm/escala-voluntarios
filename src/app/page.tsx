import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "./acoes";

const PAPEL: Record<string, string> = {
  titular: "",
  apoio: "apoio",
  treinamento: "treinamento",
  responsavel_dia: "responsável do dia",
};

const STATUS: Record<string, { texto: string; classe: string }> = {
  pendente: { texto: "Aguardando você", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  confirmado: { texto: "Confirmado", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  recusado: { texto: "Recusado", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  trocado: { texto: "Trocado", classe: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
};

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type Linha = {
  id: string;
  papel: string;
  status: string;
  eventos: { titulo: string; inicio: string } | null;
  funcoes: { nome: string } | null;
  ministerios: { nome: string } | null;
};

export default async function Inicio() {
  const supabase = await criarClienteServidor();
  const { data: pessoaId } = await supabase.rpc("vincular_conta");
  if (!pessoaId) redirect("/sem-cadastro");

  const { data: pessoa } = await supabase.from("pessoas").select("nome").eq("id", pessoaId).single();
  const { data } = await supabase
    .from("escalas")
    .select("id, papel, status, eventos!inner(titulo, inicio), funcoes(nome), ministerios(nome)")
    .eq("pessoa_id", pessoaId)
    .order("inicio", { referencedTable: "eventos", ascending: false })
    .limit(8);
  const escalas = ((data ?? []) as unknown as Linha[]).sort(
    (a, b) => +new Date(b.eventos!.inicio) - +new Date(a.eventos!.inicio),
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">Igreja Nasci Pra Deus</p>
          <h1 className="text-2xl font-semibold">Olá, {pessoa?.nome} 👋</h1>
        </div>
        <form action={sair}>
          <button className="text-sm text-neutral-500 underline">Sair</button>
        </form>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-500">Suas escalas mais recentes</h2>
        {escalas.length === 0 && <p className="text-neutral-500">Nenhuma escala ainda.</p>}
        {escalas.map((e) => {
          const s = STATUS[e.status];
          const funcao = e.funcoes?.nome ?? e.ministerios?.nome;
          const papel = PAPEL[e.papel];
          return (
            <article key={e.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize">{fmtData.format(new Date(e.eventos!.inicio))}</p>
                  <p className="text-sm text-neutral-500">
                    {e.eventos!.titulo} · {funcao}
                    {papel && ` (${papel})`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.classe}`}>{s.texto}</span>
              </div>
            </article>
          );
        })}
      </section>

      <p className="text-center text-xs text-neutral-400">Em construção: confirmação, trocas e montagem da escala.</p>
    </main>
  );
}
