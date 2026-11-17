"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { validarNovoVoluntario } from "@/lib/voluntario";
import { normalizarNumero } from "@/lib/whatsapp";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Salva (ou limpa) o e-mail de login de um voluntário. A RLS só deixa coordenadores alterarem. */
export async function salvarEmail(pessoaId: string, email: string): Promise<{ erro: string | null }> {
  const limpo = email.trim().toLowerCase();
  if (limpo && !EMAIL.test(limpo)) return { erro: "E-mail inválido" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("pessoas")
    .update({ email: limpo || null })
    .eq("id", pessoaId)
    .select("id");
  if (error) {
    return { erro: error.code === "23505" ? "Esse e-mail já é de outra pessoa" : "Não foi possível salvar" };
  }
  if (!data?.length) return { erro: "Sem permissão para alterar essa pessoa" };
  revalidatePath("/voluntarios");
  return { erro: null };
}

/** Salva (ou limpa) o celular de um voluntário; é para ele que vão os avisos de WhatsApp. A RLS só deixa coordenadores alterarem. */
export async function salvarCelular(pessoaId: string, celular: string): Promise<{ erro: string | null }> {
  const texto = celular.trim();
  if (texto && !normalizarNumero(texto)) return { erro: "Celular inválido. Use DDD + número, ex.: (11) 95402-4089" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("pessoas").update({ celular: texto || null }).eq("id", pessoaId).select("id");
  if (error) return { erro: "Não foi possível salvar" };
  if (!data?.length) return { erro: "Sem permissão para alterar essa pessoa" };
  revalidatePath("/voluntarios");
  return { erro: null };
}

export type NivelHab = "nenhuma" | "aprendiz" | "apto";

/**
 * Define o nível da pessoa numa função. Marcar aprendiz/apto também coloca a pessoa no time da área.
 * A RLS só deixa coordenador (da área) alterar.
 */
export async function definirHabilidade(pessoaId: string, funcaoId: string, nivel: NivelHab): Promise<{ erro: string | null }> {
  if (!["nenhuma", "aprendiz", "apto"].includes(nivel)) return { erro: "Nível inválido" };
  const supabase = await criarClienteServidor();
  const { data: funcao } = await supabase.from("funcoes").select("ministerio_id").eq("id", funcaoId).maybeSingle();
  if (!funcao) return { erro: "Função não encontrada" };

  if (nivel === "nenhuma") {
    const { error } = await supabase.from("habilitacoes").delete().eq("pessoa_id", pessoaId).eq("funcao_id", funcaoId);
    revalidatePath("/voluntarios");
    return { erro: error ? "Não foi possível salvar" : null };
  }

  const { error: erroTime } = await supabase
    .from("membros_ministerio")
    .upsert({ pessoa_id: pessoaId, ministerio_id: funcao.ministerio_id }, { onConflict: "pessoa_id,ministerio_id", ignoreDuplicates: true });
  if (erroTime) return { erro: "Sem permissão para colocar essa pessoa no time" };
  const { data, error } = await supabase
    .from("habilitacoes")
    .upsert({ pessoa_id: pessoaId, funcao_id: funcaoId, nivel, atualizado_em: new Date().toISOString() })
    .select("pessoa_id");
  revalidatePath("/voluntarios");
  if (error || !data?.length) return { erro: "Sem permissão para alterar as habilidades" };
  return { erro: null };
}

export type DadosNovoVoluntario = { nome: string; email: string; celular: string; ministerio: string; funcoes: string[] };

/**
 * Cadastra um voluntário no ministério (e marca as funções escolhidas como "apto").
 * A função do banco confere se quem chama coordena o ministério.
 */
export async function adicionarVoluntario(d: DadosNovoVoluntario): Promise<{ erro: string | null; nome?: string; jaExistia?: boolean }> {
  const v = validarNovoVoluntario(d);
  if (v.erro !== null) return { erro: v.erro };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("adicionar_voluntario", {
    p_nome: v.nome,
    p_email: v.email,
    p_celular: v.celular,
    p_ministerio: d.ministerio,
    p_funcoes: d.funcoes,
  });
  if (error) return { erro: error.message };
  revalidatePath("/voluntarios");
  const linha = (Array.isArray(data) ? data[0] : data) as { ja_existia?: boolean } | null;
  return { erro: null, nome: v.nome, jaExistia: !!linha?.ja_existia };
}
