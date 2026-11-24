"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dadosDisponibilidade, type DadosDisponibilidade } from "@/lib/disponibilidade-dados";
import { validarNovoVoluntario } from "@/lib/voluntario";
import { despacharFila, normalizarNumero } from "@/lib/whatsapp";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Salva (ou limpa) o e-mail de login de um voluntário. A RLS só deixa facilitadores alterarem. */
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

/** Salva (ou limpa) o celular de um voluntário; é para ele que vão os avisos de WhatsApp. A RLS só deixa facilitadores alterarem. */
export async function salvarCelular(pessoaId: string, celular: string): Promise<{ erro: string | null }> {
  const texto = celular.trim();
  if (texto && !normalizarNumero(texto)) return { erro: "Celular inválido. Use DDD + número, ex.: (11) 95402-4089" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("pessoas").update({ celular: texto || null }).eq("id", pessoaId).select("id");
  if (error) return { erro: "Não foi possível salvar" };
  if (!data?.length) return { erro: "Sem permissão para alterar essa pessoa" };
  revalidatePath("/voluntarios");
  after(() => despacharFila());
  return { erro: null };
}

export type NivelHab = "nenhuma" | "aprendiz" | "apto";

/**
 * Define o nível da pessoa numa função. Marcar aprendiz/apto também coloca a pessoa no time da área.
 * A RLS só deixa facilitador (da área) alterar.
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

export type DadosNovoVoluntario = { nome: string; email: string; celular: string; aniversario: string; ministerio: string; funcoes: string[] };

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
    p_aniversario: v.aniversario,
  });
  if (error) return { erro: error.message };
  revalidatePath("/voluntarios");
  after(() => despacharFila()); // envia na hora a boas-vindas da pessoa nova (o banco só enfileira)
  const linha = (Array.isArray(data) ? data[0] : data) as { ja_existia?: boolean } | null;
  return { erro: null, nome: v.nome, jaExistia: !!linha?.ja_existia };
}

export type EscalaProxima = { quando: string; evento: string; ministerio: string; funcao: string | null; status: string };

/** Disponibilidade e próximas escalas de um voluntário, para o facilitador conferir. */
export async function carregarDisponibilidade(
  pessoaId: string,
): Promise<{ erro: string | null; dados?: DadosDisponibilidade; proximas?: EscalaProxima[] }> {
  const supabase = await criarClienteServidor();
  const { data: pode } = await supabase.rpc("coordeno_pessoa", { p: pessoaId });
  if (!pode) return { erro: "Sem permissão para ver essa pessoa" };
  const [dados, { data: esc }] = await Promise.all([
    dadosDisponibilidade(supabase, pessoaId),
    supabase
      .from("escalas")
      .select("status, eventos!inner(titulo, inicio), ministerios(nome), funcoes(nome)")
      .eq("pessoa_id", pessoaId)
      .in("status", ["pendente", "confirmado"])
      .gte("eventos.inicio", new Date().toISOString())
      .order("inicio", { referencedTable: "eventos", ascending: true })
      .limit(8),
  ]);
  const proximas = ((esc ?? []) as unknown as {
    status: string;
    eventos: { titulo: string; inicio: string };
    ministerios: { nome: string } | null;
    funcoes: { nome: string } | null;
  }[]).map((e) => ({
    quando: e.eventos.inicio,
    evento: e.eventos.titulo,
    ministerio: e.ministerios?.nome ?? "",
    funcao: e.funcoes?.nome ?? null,
    status: e.status,
  }));
  proximas.sort((a, b) => a.quando.localeCompare(b.quando));
  return { erro: null, dados, proximas };
}
