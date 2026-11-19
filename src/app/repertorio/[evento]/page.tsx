import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import type { MusicaBiblioteca } from "@/lib/musicas";
import { formatarAtualizacao, podeProgramar, type Musica } from "@/lib/repertorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { EditorRepertorio } from "./editor";

export default async function RepertorioDoEvento({ params }: { params: Promise<{ evento: string }> }) {
  const { evento } = await params;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: pode } = await supabase.rpc("pode_ver_repertorio");
  if (!pode) redirect("/");
  const { data: edita } = await supabase.rpc("pode_editar_repertorio");

  const { data: ev } = await supabase.from("eventos").select("id, titulo, inicio").eq("id", evento).maybeSingle();
  if (!ev) notFound();
  const [{ data: rep }, { data: linhas }, { data: lib }] = await Promise.all([
    supabase.from("repertorios").select("atualizado_em, publicado, programado_para").eq("evento_id", evento).maybeSingle(),
    supabase.from("repertorio_musicas").select("bloco, ordem, titulo, artista, tom, musica_id").eq("evento_id", evento),
    edita ? supabase.from("musicas").select("id, titulo, artista, tom, link_letra, link_cifra, link_video, link_audio, observacao").order("titulo").limit(2000) : Promise.resolve({ data: [] as MusicaBiblioteca[] }),
  ]);
  const ordemBloco = { abertura: 1, ofertorio: 2, encerramento: 3 } as const;
  const musicas: Musica[] = (linhas ?? [])
    .sort((a, b) => ordemBloco[a.bloco as keyof typeof ordemBloco] - ordemBloco[b.bloco as keyof typeof ordemBloco] || a.ordem - b.ordem)
    .map((m) => ({ bloco: m.bloco as Musica["bloco"], titulo: m.titulo, artista: m.artista ?? "", tom: m.tom ?? "", musicaId: m.musica_id }));
  const passou = new Date(ev.inicio).getTime() < Date.now() - 12 * 3_600_000;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/repertorio" className="text-sm text-neutral-500 underline">← Repertório dos cultos</Link>
      <h1 className="text-2xl font-semibold">{ev.titulo}</h1>
      <p className="capitalize text-neutral-500">{fmtDataHora.format(new Date(ev.inicio))}</p>
      {rep && !rep.publicado ? (
        <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {rep.programado_para ? "⏰ Programado: o aviso sai às 7h30 do dia do culto." : "📝 Rascunho: ninguém foi avisado e só você vê."}
        </p>
      ) : rep ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          🎵 Atualizado em <strong>{formatarAtualizacao(rep.atualizado_em)}</strong>
        </p>
      ) : (
        <p className="rounded-xl bg-neutral-100 px-4 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          Repertório ainda não enviado.
        </p>
      )}
      <EditorRepertorio evento={evento} inicial={musicas} publicado={rep?.publicado ?? false} programadoPara={rep?.programado_para ?? null} podeProgramar={podeProgramar(ev.inicio)} podeEditar={!!edita && !passou} veTom={!!edita} biblioteca={(lib ?? []) as MusicaBiblioteca[]} />
    </main>
  );
}
