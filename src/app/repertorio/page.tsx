import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { formatarAtualizacao } from "@/lib/repertorio";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function Repertorios() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: pode } = await supabase.rpc("pode_ver_repertorio");
  if (!pode) redirect("/");
  const { data: edita } = await supabase.rpc("pode_editar_repertorio");
  const { data: biblioteca } = await supabase.rpc("pode_ver_biblioteca");

  const desde = new Date(Date.now() - 12 * 3_600_000).toISOString();
  const [{ data: eventos }, { data: reps }] = await Promise.all([
    supabase.from("eventos").select("id, titulo, inicio").gte("inicio", desde).order("inicio").limit(40),
    supabase.from("repertorios").select("evento_id, atualizado_em"),
  ]);
  const atualizado = new Map((reps ?? []).map((r) => [r.evento_id, r.atualizado_em as string]));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Repertório dos cultos</h1>
      <p className="text-sm text-neutral-500">
        {edita
          ? "Monte as músicas de cada culto: de 3 a 4 de abertura, 1 no ofertório (opcional) e 1 de encerramento. A Projeção é avisada a cada alteração."
          : "As músicas de cada culto, definidas pelo Louvor. Se mudar, você é avisado e o horário da última atualização aparece aqui."}
      </p>
      {biblioteca && (
        <Link href="/biblioteca" className="rounded-xl bg-pink-50 px-4 py-3 text-sm dark:bg-pink-950/30">
          📚 Biblioteca de músicas: tom, letra, cifra e vídeo. <span className="underline">Abrir</span>
        </Link>
      )}
      {(eventos ?? []).length === 0 && <p className="text-neutral-500">Nenhum evento próximo.</p>}
      {(eventos ?? []).map((e) => {
        const quando = atualizado.get(e.id);
        return (
          <Link
            key={e.id}
            href={`/repertorio/${e.id}`}
            className="flex flex-col gap-1 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700"
          >
            <p className="font-medium capitalize">{fmtDataHora.format(new Date(e.inicio))}</p>
            <p>{e.titulo}</p>
            <p className={`text-sm ${quando ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-500"}`}>
              {quando ? `🎵 Atualizado em ${formatarAtualizacao(quando)}` : edita ? "Sem repertório ainda" : "Repertório ainda não enviado"}
            </p>
          </Link>
        );
      })}
    </main>
  );
}
