import Link from "next/link";
import { redirect } from "next/navigation";
import type { MusicaBiblioteca } from "@/lib/musicas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaBiblioteca } from "./tela";

export default async function Biblioteca() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: pode } = await supabase.rpc("pode_ver_biblioteca");
  if (!pode) redirect("/");
  const { data: edita } = await supabase.rpc("pode_editar_repertorio");
  const { data } = await supabase
    .from("musicas")
    .select("id, titulo, artista, tom, link_letra, link_cifra, link_video, link_audio, observacao")
    .order("titulo")
    .limit(2000);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/repertorio" className="text-sm text-neutral-500 underline">← Repertório dos cultos</Link>
      <h1 className="text-2xl font-semibold">Biblioteca de músicas</h1>
      <p className="text-sm text-neutral-500">
        {edita
          ? "As músicas da igreja, com tom, letra, cifra, vídeo e áudio. Quem você escolhe no repertório do culto já vem daqui, e música nova digitada no repertório entra aqui sozinha."
          : "As músicas do Louvor, com tom e links de letra, cifra, vídeo e áudio."}
      </p>
      <TelaBiblioteca musicas={(data ?? []) as MusicaBiblioteca[]} podeEditar={!!edita} />
    </main>
  );
}
