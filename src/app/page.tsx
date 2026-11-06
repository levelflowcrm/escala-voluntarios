import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
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

type Linha = {
  id: string;
  papel: string;
  status: string;
  motivo: string | null;
  eventos: { titulo: string; inicio: string };
  funcoes: { nome: string } | null;
  ministerios: { nome: string } | null;
};

const CAMPOS = "id, papel, status, motivo, eventos!inner(titulo, inicio), funcoes(nome), ministerios(nome)";

export default async function Inicio() {
  const supabase = await criarClienteServidor();
  const { data: pessoaId } = await supabase.rpc("vincular_conta");
  if (!pessoaId) redirect("/sem-cadastro");

  const agora = new Date().toISOString();
  const [{ data: pessoa }, { data: coordenador }, { data: futuras }, { data: passadas }] = await Promise.all([
    supabase.from("pessoas").select("nome").eq("id", pessoaId).single(),
    supabase.rpc("sou_coordenador_algum"),
    supabase
      .from("escalas")
      .select(CAMPOS)
      .eq("pessoa_id", pessoaId)
      .neq("status", "trocado")
      .gte("eventos.inicio", agora)
      .order("inicio", { referencedTable: "eventos" })
      .limit(20),
    supabase
      .from("escalas")
      .select(CAMPOS)
      .eq("pessoa_id", pessoaId)
      .lt("eventos.inicio", agora)
      .order("inicio", { referencedTable: "eventos", ascending: false })
      .limit(5),
  ]);

  // A ordenação por tabela relacionada não ordena as linhas principais; ordena aqui.
  const porData = (lista: Linha[], sentido: 1 | -1) =>
    lista.sort((a, b) => sentido * (+new Date(a.eventos.inicio) - +new Date(b.eventos.inicio)));
  const proximas = porData((futuras ?? []) as unknown as Linha[], 1);
  const historico = porData((passadas ?? []) as unknown as Linha[], -1);
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
          <h1 className="text-2xl font-semibold">Olá, {pessoa?.nome} 👋</h1>
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
