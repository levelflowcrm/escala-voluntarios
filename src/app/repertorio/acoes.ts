"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { type Musica, validarRepertorio } from "@/lib/repertorio";
import { criarClienteServidor } from "@/lib/supabase/server";
import { despacharFila } from "@/lib/whatsapp";

type R = { erro: string | null; atualizadoEm?: string };

/** Grava o repertório inteiro do evento. O banco confere permissão e regras; a Projeção é avisada por WhatsApp. */
export async function salvarRepertorio(evento: string, musicas: Musica[]): Promise<R> {
  const erro = validarRepertorio(musicas);
  if (erro) return { erro };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("salvar_repertorio", {
    p_evento: evento,
    p_musicas: musicas.map((m) => ({ bloco: m.bloco, titulo: m.titulo.trim(), artista: m.artista.trim(), tom: m.tom.trim(), musica_id: m.musicaId ?? null })),
  });
  if (error) return { erro: error.message };
  after(() => despacharFila());
  revalidatePath("/repertorio");
  revalidatePath("/biblioteca");
  revalidatePath(`/repertorio/${evento}`);
  return { erro: null, atualizadoEm: data as string };
}
