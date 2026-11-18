"use server";

import { revalidatePath } from "next/cache";
import { CORES } from "@/lib/cores-evento";
import { validarNomeTipo } from "@/lib/tipos-evento";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro: string | null };

function atualizar() {
  revalidatePath("/agenda");
  revalidatePath("/agenda/tipos");
}

function corValida(cor: string): string | null | false {
  if (!cor) return null;
  return CORES[cor] ? cor : false;
}

/** Cria um tipo de evento (só o master; a RLS barra os demais). */
export async function criarTipoEvento(nomeBruto: string, cor: string): Promise<R> {
  const v = validarNomeTipo(nomeBruto);
  if (v.erro !== null) return { erro: v.erro };
  const c = corValida(cor);
  if (c === false) return { erro: "Cor inválida" };
  const supabase = await criarClienteServidor();
  const { data: master } = await supabase.rpc("sou_admin_master");
  if (!master) return { erro: "Só o administrador da igreja pode cadastrar tipos de evento." };
  const { data: igrejaId } = await supabase.rpc("minha_igreja");
  const { error } = await supabase.from("tipos_evento").insert({ igreja_id: igrejaId, nome: v.nome, cor: c });
  atualizar();
  if (error) return { erro: error.code === "23505" ? "Já existe um tipo com esse nome." : "Não foi possível salvar agora." };
  return { erro: null };
}

/** Renomeia e/ou muda a cor padrão. Os eventos já criados continuam ligados ao tipo e passam a mostrar o novo nome. */
export async function editarTipoEvento(id: string, nomeBruto: string, cor: string): Promise<R> {
  const v = validarNomeTipo(nomeBruto);
  if (v.erro !== null) return { erro: v.erro };
  const c = corValida(cor);
  if (c === false) return { erro: "Cor inválida" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tipos_evento").update({ nome: v.nome, cor: c }).eq("id", id).is("dia_semana", null).select("id");
  atualizar();
  if (error) return { erro: error.code === "23505" ? "Já existe um tipo com esse nome." : "Não foi possível salvar agora." };
  if (!data?.length) return { erro: "Tipo não encontrado ou sem permissão." };
  return { erro: null };
}

/** Desativa/reativa: tipo desativado some da lista de novos eventos, mas os eventos antigos mantêm o histórico. */
export async function alternarTipoEvento(id: string, ativo: boolean): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tipos_evento").update({ ativo }).eq("id", id).is("dia_semana", null).select("id");
  atualizar();
  return error || !data?.length ? { erro: "Sem permissão para alterar esse tipo." } : { erro: null };
}

/** Exclui o tipo. Os eventos que o usavam continuam existindo, só ficam sem tipo (e sem a cor padrão dele). */
export async function excluirTipoEvento(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tipos_evento").delete().eq("id", id).is("dia_semana", null).select("id");
  atualizar();
  return error || !data?.length ? { erro: "Não foi possível excluir (sem permissão ou tipo não encontrado)." } : { erro: null };
}
