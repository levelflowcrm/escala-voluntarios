"use server";

import { revalidatePath } from "next/cache";
import { moverParaDiaDaSemana, somarDias, validarCultoFixo } from "@/lib/cultos";
import { diaNoFuso, inicioNoFuso } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro: string | null; aviso?: string };
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function atualizar() {
  revalidatePath("/cultos-fixos");
  revalidatePath("/montar");
  revalidatePath("/");
}

export type DadosCultoFixo = { id?: string; nome: string; diaSemana: number; hora: string; aplicarFuturos?: boolean };

/**
 * Cria ou edita um culto fixo (dia da semana + horário). Com "aplicarFuturos", os cultos futuros já criados
 * também mudam: ganham o novo horário e vão para o novo dia da semana, na mesma semana.
 */
export async function salvarCultoFixo(d: DadosCultoFixo): Promise<R> {
  const v = validarCultoFixo(d);
  if (v.erro) return { erro: v.erro };
  const nome = d.nome.trim();
  const supabase = await criarClienteServidor();

  if (!d.id) {
    const { data: igrejaId } = await supabase.rpc("minha_igreja");
    if (!igrejaId) return { erro: "Cadastro não encontrado" };
    const { error } = await supabase.from("tipos_evento").insert({ igreja_id: igrejaId, nome, dia_semana: d.diaSemana, hora: d.hora });
    atualizar();
    if (error) return { erro: error.code === "23505" ? "Já existe um culto com esse nome" : "Não foi possível salvar" };
    return { erro: null, aviso: "Culto fixo criado. Use “Gerar cultos” em Montar para criá-lo nos meses." };
  }

  const { data: atualizado, error } = await supabase
    .from("tipos_evento")
    .update({ nome, dia_semana: d.diaSemana, hora: d.hora })
    .eq("id", d.id)
    .select("id");
  if (error) return { erro: error.code === "23505" ? "Já existe um culto com esse nome" : "Não foi possível salvar" };
  if (!atualizado?.length) return { erro: "Sem permissão para alterar esse culto" };

  let movidos = 0;
  if (d.aplicarFuturos) {
    const { data: futuros } = await supabase
      .from("eventos")
      .select("id, inicio, ocorrencia")
      .eq("tipo_evento_id", d.id)
      .eq("so_agenda", false)
      .gte("inicio", new Date().toISOString());
    for (const e of futuros ?? []) {
      const dia = e.ocorrencia ?? diaNoFuso(new Date(e.inicio));
      const novoDia = moverParaDiaDaSemana(dia, d.diaSemana);
      const r = await supabase
        .from("eventos")
        .update({ titulo: nome, inicio: inicioNoFuso(novoDia, d.hora), ocorrencia: novoDia })
        .eq("id", e.id);
      if (!r.error) movidos++;
    }
  }
  atualizar();
  return { erro: null, aviso: d.aplicarFuturos ? `Culto fixo salvo; ${movidos} culto(s) futuro(s) ajustado(s).` : "Culto fixo salvo. Vale para os próximos cultos gerados." };
}

/** Desativa/reativa um culto fixo (desativado não é mais gerado nos meses). */
export async function alternarCultoFixo(id: string, ativo: boolean): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("tipos_evento").update({ ativo }).eq("id", id).select("id");
  atualizar();
  return error || !data?.length ? { erro: "Sem permissão para alterar esse culto" } : { erro: null };
}

export type DadosPausa = { tipoId: string | null; de: string; ate: string; motivo: string };

function validarPausa(d: DadosPausa): string | null {
  if (!DATA.test(d.de) || !DATA.test(d.ate)) return "Informe a data inicial e a final";
  if (d.ate < d.de) return "A data final precisa ser igual ou depois da inicial";
  if (d.motivo.length > 200) return "Motivo muito longo (máximo 200 letras)";
  return null;
}

async function cultosNaPausa(d: DadosPausa) {
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("eventos")
    .select("id, tipo_evento_id")
    .eq("so_agenda", false)
    .not("tipo_evento_id", "is", null)
    .gte("inicio", inicioNoFuso(d.de, "00:00"))
    .lt("inicio", inicioNoFuso(somarDias(d.ate, 1), "00:00"));
  if (d.tipoId) consulta = consulta.eq("tipo_evento_id", d.tipoId);
  const { data } = await consulta;
  return { supabase, ids: (data ?? []).map((e) => e.id as string) };
}

/** Prévia: quantos cultos já criados serão removidos e quantas pessoas estão escaladas neles. */
export async function previaPausa(d: DadosPausa): Promise<{ erro: string | null; cultos: number; escalados: number }> {
  const erro = validarPausa(d);
  if (erro) return { erro, cultos: 0, escalados: 0 };
  const { supabase, ids } = await cultosNaPausa(d);
  if (ids.length === 0) return { erro: null, cultos: 0, escalados: 0 };
  const { count } = await supabase.from("escalas").select("id", { count: "exact", head: true }).in("evento_id", ids).in("status", ["pendente", "confirmado"]);
  return { erro: null, cultos: ids.length, escalados: count ?? 0 };
}

/** Registra um período em que o culto (ou todos os fixos) não acontece e remove os cultos já criados nele. */
export async function criarPausa(d: DadosPausa): Promise<R> {
  const erro = validarPausa(d);
  if (erro) return { erro };
  const { supabase, ids } = await cultosNaPausa(d);
  const { data: igrejaId } = await supabase.rpc("minha_igreja");
  if (!igrejaId) return { erro: "Cadastro não encontrado" };
  const { error } = await supabase
    .from("pausas_cultos")
    .insert({ igreja_id: igrejaId, tipo_evento_id: d.tipoId, de: d.de, ate: d.ate, motivo: d.motivo.trim() || null });
  if (error) return { erro: "Sem permissão ou não foi possível salvar a pausa" };
  if (ids.length) await supabase.from("eventos").delete().in("id", ids);
  atualizar();
  return { erro: null, aviso: ids.length ? `Pausa criada e ${ids.length} culto(s) removido(s).` : "Pausa criada. Os cultos desse período não serão gerados." };
}

/** Remove uma pausa. Os cultos do período voltam quando você usar “Gerar cultos” em Montar. */
export async function removerPausa(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("pausas_cultos").delete().eq("id", id).select("id");
  atualizar();
  return error || !data?.length
    ? { erro: "Sem permissão para remover essa pausa" }
    : { erro: null, aviso: "Pausa removida. Use “Gerar cultos” em Montar para recriar os cultos desse período." };
}

