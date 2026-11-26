import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { adicionarDestinatario, removerDestinatario } from "./acoes";

/** "5511954024089" → "(11) 95402-4089" */
function formatar(n: string): string {
  const d = n.replace(/\D/g, "").replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : n;
}

export default async function Destinatarios({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: pode } = await supabase.rpc("pode_ver_metricas");
  if (!pode) redirect("/");
  const { data: lista } = await supabase.from("metricas_destinatarios").select("id, nome, celular").order("nome");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/metricas" className="text-sm text-neutral-500 underline">← Métricas dos cultos</Link>
      <h1 className="text-2xl font-semibold">Quem recebe o relatório</h1>
      <p className="text-sm text-neutral-500">Cada pessoa abaixo recebe o PDF por WhatsApp quando você usa &quot;Salvar e enviar relatório&quot; na contagem de um culto.</p>

      <ul className="flex flex-col gap-2">
        {(lista ?? []).length === 0 && <li className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-700">Ninguém cadastrado ainda.</li>}
        {(lista ?? []).map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="min-w-0">
              <p className="truncate font-medium">{d.nome}</p>
              <p className="text-sm tabular-nums text-neutral-500">{formatar(d.celular)}</p>
            </div>
            <form action={removerDestinatario}>
              <input type="hidden" name="id" value={d.id} />
              <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700" aria-label={`Remover ${d.nome}`}>Remover</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={adicionarDestinatario} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Adicionar pessoa</h2>
        <input name="nome" placeholder="Nome" maxLength={80} required className="h-11 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700" />
        <input name="celular" placeholder="WhatsApp com DDD" inputMode="tel" required className="h-11 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700" />
        {erro && <p className="text-sm text-rose-700 dark:text-rose-400">{erro}</p>}
        <button className="h-11 rounded-xl bg-blue-600 font-medium text-white">Adicionar</button>
      </form>
    </main>
  );
}
