import type { criarClienteServidor } from "@/lib/supabase/server";
import { montarCelebracao, type Celebracao, type MotivoPontos } from "./celebracao";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Pontuação atual da própria pessoa (null se não conseguir ler). */
export async function pontosAtuais(supabase: Cliente): Promise<number | null> {
  const { data } = await supabase.rpc("minha_pontuacao");
  const linha = ((data ?? []) as { pontos: number }[])[0];
  return linha ? linha.pontos : null;
}

/**
 * Monta a animação para o voluntário logado. `antes` é a pontuação lida antes da ação: quando vem,
 * a variação real (depois − antes) alimenta perdas e recuperações. Nunca lança: animação é só carinho.
 */
export async function celebrar(supabase: Cliente, motivo: MotivoPontos, antes?: number | null): Promise<Celebracao | undefined> {
  try {
    const { data: eu } = await supabase.rpc("minha_pessoa");
    if (!eu) return undefined;
    const [{ data: pessoa }, depois] = await Promise.all([supabase.from("pessoas").select("nome").eq("id", eu).maybeSingle(), pontosAtuais(supabase)]);
    const atual = depois ?? antes ?? 0;
    const variacao = antes != null && depois != null ? depois - antes : undefined;
    return montarCelebracao(motivo, pessoa?.nome ?? "", atual, variacao);
  } catch {
    return undefined;
  }
}
