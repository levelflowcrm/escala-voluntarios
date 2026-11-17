"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { CORES } from "@/lib/cores-evento";
import { emPausa, type Pausa } from "@/lib/cultos";
import { diaNoFuso, diasDaSemanaNoMes, FUSO, inicioNoFuso, limitesMes, mesValido } from "@/lib/datas";
import { sugerirEscala, type VoluntarioEntrada } from "@/lib/escala/sugerir";
import { criarClienteServidor } from "@/lib/supabase/server";
import { despacharFila } from "@/lib/whatsapp";

type Resultado = { erro: string | null; aviso?: string };

const ATIVOS = ["pendente", "confirmado"];
const DIA_MS = 86_400_000;

function traduzirErro(e: { code?: string; message: string } | null): string | null {
  if (!e) return null;
  if (e.code === "23505") return "Essa pessoa já está escalada neste evento (talvez em outro ministério).";
  if (e.code === "42501") return "Você não tem permissão para mexer nessa escala.";
  return e.message;
}

/** Garante a linha de situação (rascunho) do ministério nesses eventos. */
async function garantirSituacao(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  ministerioId: string,
  eventoIds: string[],
) {
  if (eventoIds.length === 0) return null;
  const { error } = await supabase
    .from("escalas_ministerio")
    .upsert(
      eventoIds.map((evento_id) => ({ evento_id, ministerio_id: ministerioId })),
      { onConflict: "evento_id,ministerio_id", ignoreDuplicates: true },
    );
  return error;
}

/** Coloca (ou tira, com pessoaId nulo) o titular de uma função num evento. */
export async function definirTitular(
  ministerioId: string,
  eventoId: string,
  funcaoId: string,
  pessoaId: string | null,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data: atual } = await supabase
    .from("escalas")
    .select("id, pessoa_id, status")
    .eq("evento_id", eventoId)
    .eq("funcao_id", funcaoId)
    .eq("papel", "titular")
    .in("status", ATIVOS)
    .maybeSingle();

  if (atual?.pessoa_id === pessoaId) return { erro: null };

  if (atual) {
    // Ainda sem resposta: some. Já confirmada: fica no histórico como "trocado".
    const { error } =
      atual.status === "pendente"
        ? await supabase.from("escalas").delete().eq("id", atual.id)
        : await supabase.from("escalas").update({ status: "trocado" }).eq("id", atual.id);
    if (error) return { erro: traduzirErro(error) };
  }

  if (pessoaId) {
    const erroSituacao = await garantirSituacao(supabase, ministerioId, [eventoId]);
    if (erroSituacao) return { erro: traduzirErro(erroSituacao) };
    const { error } = await supabase.from("escalas").insert({
      evento_id: eventoId,
      ministerio_id: ministerioId,
      funcao_id: funcaoId,
      pessoa_id: pessoaId,
      papel: "titular",
    });
    if (error) {
      revalidatePath("/montar");
      return { erro: traduzirErro(error) };
    }
  }

  revalidatePath("/montar");
  return { erro: null };
}

/** Cria no mês os cultos fixos (tipos de evento com dia da semana) que ainda não existem. */
export async function gerarCultos(mes: string): Promise<Resultado> {
  if (!mesValido(mes)) return { erro: "Mês inválido" };
  const supabase = await criarClienteServidor();
  const { data: master } = await supabase.rpc("sou_admin_master");
  if (!master) return { erro: "Só o administrador da igreja cria os cultos do mês." };
  const { inicio, fim } = limitesMes(mes);

  const [{ data: igrejaId }, { data: tipos }, { data: existentes }, { data: pausas }] = await Promise.all([
    supabase.rpc("minha_igreja"),
    supabase.from("tipos_evento").select("id, nome, dia_semana, hora").eq("ativo", true).not("dia_semana", "is", null),
    supabase.from("eventos").select("tipo_evento_id, inicio, ocorrencia").gte("inicio", inicio).lt("inicio", fim),
    supabase.from("pausas_cultos").select("tipo_evento_id, de, ate").gte("ate", `${mes}-01`),
  ]);
  if (!igrejaId) return { erro: "Cadastro não encontrado" };

  // Um culto fixo "já existe" no dia para o qual foi gerado, mesmo que depois tenha mudado de horário.
  const jaTem = new Set((existentes ?? []).map((e) => `${e.tipo_evento_id}|${e.ocorrencia ?? diaNoFuso(new Date(e.inicio))}`));
  const novos = (tipos ?? []).flatMap((t) =>
    diasDaSemanaNoMes(mes, t.dia_semana!)
      .filter((dia) => !jaTem.has(`${t.id}|${dia}`) && !emPausa(dia, t.id, (pausas ?? []) as Pausa[]))
      .map((dia) => ({ igreja_id: igrejaId, tipo_evento_id: t.id, titulo: t.nome, inicio: inicioNoFuso(dia, t.hora ?? "19:00"), ocorrencia: dia })),
  );

  if (novos.length === 0) return { erro: null, aviso: "Os cultos fixos do mês já estavam criados." };
  const { error } = await supabase.from("eventos").insert(novos);
  revalidatePath("/montar");
  return error ? { erro: traduzirErro(error) } : { erro: null, aviso: `${novos.length} cultos criados.` };
}

/** Preenche as vagas vazias dos eventos futuros do mês com o rodízio automático. */
export async function sugerir(ministerioId: string, mes: string): Promise<Resultado> {
  if (!mesValido(mes)) return { erro: "Mês inválido" };
  const supabase = await criarClienteServidor();
  const { inicio, fim } = limitesMes(mes);
  const agora = new Date();

  const [{ data: funcoes }, { data: eventosMes }, { data: membros }] = await Promise.all([
    supabase.from("funcoes").select("id, nome").eq("ministerio_id", ministerioId).eq("ativo", true).order("ordem"),
    supabase
      .from("eventos")
      .select("id, inicio, intensivo, convocacao_geral")
      .eq("so_agenda", false)
      .gte("inicio", inicio)
      .lt("inicio", fim)
      .order("inicio"),
    supabase.from("membros_ministerio").select("pessoa_id, pessoas!inner(nome, ativo)").eq("ministerio_id", ministerioId),
  ]);
  if (!funcoes?.length) return { erro: "Este ministério ainda não tem funções cadastradas." };

  // Eventos que o ministério dispensou não entram na sugestão
  const { data: dispensas } = await supabase.from("eventos_dispensados").select("evento_id").eq("ministerio_id", ministerioId);
  const dispensados = new Set((dispensas ?? []).map((d) => d.evento_id as string));
  const eventosAtivos = (eventosMes ?? []).filter((e) => !dispensados.has(e.id));

  const eventosIds = eventosAtivos.map((e) => e.id);
  const pessoaIds = (membros ?? [])
    .filter((m) => (m.pessoas as unknown as { ativo: boolean }).ativo)
    .map((m) => m.pessoa_id);
  const desde = new Date(new Date(inicio).getTime() - 90 * DIA_MS).toISOString();

  const [{ data: escalasMes }, { data: habs }, { data: indisp }, { data: bloq }, { data: anteriores }, { data: prefs }, { data: ocupacoes }] =
    await Promise.all([
      supabase.from("escalas").select("evento_id, ministerio_id, funcao_id, pessoa_id, papel").in("evento_id", eventosIds).in("status", ATIVOS),
      supabase.from("habilitacoes").select("pessoa_id, funcao_id").eq("nivel", "apto").in("funcao_id", funcoes.map((f) => f.id)),
      supabase.from("indisponibilidades").select("pessoa_id, dia_semana, periodo, ordem_no_mes").in("pessoa_id", pessoaIds),
      supabase.from("bloqueios").select("pessoa_id, inicio, fim").in("pessoa_id", pessoaIds),
      supabase
        .from("escalas")
        .select("pessoa_id, funcao_id, eventos!inner(inicio)")
        .in("pessoa_id", pessoaIds)
        .in("status", ATIVOS)
        .gte("eventos.inicio", desde)
        .lt("eventos.inicio", inicio),
      supabase.from("preferencias").select("pessoa_id, limite_mensal").in("pessoa_id", pessoaIds),
      // Quem já está ocupado em qualquer ministério (inclusive rascunhos que não enxergamos)
      supabase.rpc("ocupacoes_do_periodo", { p_inicio: inicio, p_fim: fim }),
    ]);

  // Eventos que entram: futuros, não são reunião geral e não têm responsável do dia neste ministério
  const comResponsavel = new Set(
    (escalasMes ?? []).filter((e) => e.ministerio_id === ministerioId && e.papel === "responsavel_dia").map((e) => e.evento_id),
  );
  const alvo = eventosAtivos.filter(
    (e) => new Date(e.inicio) > agora && !e.convocacao_geral && !comResponsavel.has(e.id),
  );
  if (alvo.length === 0) return { erro: null, aviso: "Não há eventos futuros com vagas neste mês." };

  const nomes = new Map((membros ?? []).map((m) => [m.pessoa_id, (m.pessoas as unknown as { nome: string }).nome]));
  const voluntarios: VoluntarioEntrada[] = pessoaIds.map((id) => ({
    id,
    nome: nomes.get(id) ?? "",
    funcoesAptas: (habs ?? []).filter((h) => h.pessoa_id === id).map((h) => h.funcao_id),
    indisponibilidades: (indisp ?? [])
      .filter((i) => i.pessoa_id === id)
      .map((i) => ({ diaSemana: i.dia_semana, periodo: i.periodo, ordemNoMes: i.ordem_no_mes })),
    bloqueios: (bloq ?? []).filter((b) => b.pessoa_id === id).map((b) => ({ inicio: b.inicio, fim: b.fim })),
    limitePorMes: (prefs ?? []).find((p) => p.pessoa_id === id)?.limite_mensal ?? null,
    // Perfil: onde a pessoa mais serviu nos últimos 90 dias
    afinidade: (anteriores ?? [])
      .filter((a) => a.pessoa_id === id && a.funcao_id)
      .reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.funcao_id as string]: (acc[a.funcao_id as string] ?? 0) + 1 }), {}),
    historico: (anteriores ?? [])
      .filter((a) => a.pessoa_id === id)
      .map((a) => (a.eventos as unknown as { inicio: string }).inicio),
  }));

  // Tudo que já está no mês conta (outros ministérios também: ninguém faz duas coisas no mesmo evento)
  const existentes = (escalasMes ?? []).map((e) => ({
    eventoId: e.evento_id,
    pessoaId: e.pessoa_id,
    funcaoId: e.ministerio_id === ministerioId && e.papel === "titular" ? e.funcao_id : null,
  }));
  const jaContados = new Set(existentes.map((e) => `${e.eventoId}|${e.pessoaId}`));
  for (const o of (ocupacoes ?? []) as { evento_id: string; pessoa_id: string }[]) {
    if (!jaContados.has(`${o.evento_id}|${o.pessoa_id}`)) existentes.push({ eventoId: o.evento_id, pessoaId: o.pessoa_id, funcaoId: null });
  }

  const { atribuicoes, vagasSemCandidato } = sugerirEscala(
    alvo.map((e) => ({ id: e.id, inicio: e.inicio, intensivo: e.intensivo })),
    funcoes,
    voluntarios,
    existentes,
    { fuso: FUSO, hoje: agora },
  );

  const erroSituacao = await garantirSituacao(supabase, ministerioId, [...new Set(atribuicoes.map((a) => a.eventoId))]);
  if (erroSituacao) return { erro: traduzirErro(erroSituacao) };

  // Uma por vez: se alguém já estiver num rascunho de outro ministério (que não enxergamos), só aquela falha.
  let falhas = 0;
  for (const a of atribuicoes) {
    const { error } = await supabase.from("escalas").insert({
      evento_id: a.eventoId,
      ministerio_id: ministerioId,
      funcao_id: a.funcaoId,
      pessoa_id: a.pessoaId,
      papel: "titular",
    });
    if (error) falhas++;
  }

  revalidatePath("/montar");
  const comAlerta = atribuicoes.filter((a) => a.alertas.length > 0).length;
  const partes = [`${atribuicoes.length - falhas} vagas preenchidas`];
  if (comAlerta) partes.push(`${comAlerta} com alerta (ex.: serviu há poucos dias)`);
  if (vagasSemCandidato.length) partes.push(`${vagasSemCandidato.length} sem ninguém disponível`);
  if (falhas) partes.push(`${falhas} não entraram por conflito com outro ministério`);
  return { erro: null, aviso: partes.join(", ") + "." };
}

/** Publica a escala do mês: os voluntários passam a ver e a confirmar. */
export async function publicar(ministerioId: string, mes: string): Promise<Resultado> {
  if (!mesValido(mes)) return { erro: "Mês inválido" };
  const supabase = await criarClienteServidor();
  const { inicio, fim } = limitesMes(mes);
  const { data: eventos } = await supabase.from("eventos").select("id").gte("inicio", inicio).lt("inicio", fim);
  const ids = (eventos ?? []).map((e) => e.id);
  if (ids.length === 0) return { erro: null, aviso: "Nenhum evento no mês." };

  const { data, error } = await supabase
    .from("escalas_ministerio")
    .update({ publicada: true, publicada_em: new Date().toISOString() })
    .eq("ministerio_id", ministerioId)
    .eq("publicada", false)
    .in("evento_id", ids)
    .select("evento_id");
  revalidatePath("/montar");
  revalidatePath("/");
  if (error) return { erro: traduzirErro(error) };
  if (data.length) after(() => despacharFila()); // avisa quem foi escalado por WhatsApp
  return { erro: null, aviso: data.length ? `${data.length} eventos publicados.` : "Já estava tudo publicado." };
}

/** O coordenador dispensa (ou volta a escalar) um evento para o PRÓPRIO ministério. A função do banco confere a permissão. */
export async function dispensarEvento(eventoId: string, ministerioId: string, dispensar: boolean): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("dispensar_evento", { p_evento: eventoId, p_ministerio: ministerioId, p_dispensar: dispensar });
  revalidatePath("/montar");
  revalidatePath("/");
  if (error) return { erro: traduzirErro(error) };
  return { erro: null, aviso: dispensar ? "Evento dispensado para o seu ministério. Ele fica em “Dispensados” caso mude de ideia." : "Evento de volta na escala do seu ministério." };
}

/** Define (ou limpa, com "") a cor de um evento. Só o administrador master (a RLS barra os demais). */
export async function definirCorEvento(eventoId: string, cor: string): Promise<Resultado> {
  if (cor && !CORES[cor]) return { erro: "Cor inválida" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("eventos").update({ cor: cor || null }).eq("id", eventoId).eq("so_agenda", false).select("id");
  revalidatePath("/montar");
  revalidatePath("/");
  if (error || !data?.length) return { erro: "Sem permissão para alterar a cor desse evento" };
  return { erro: null };
}

/** Muda o dia/horário de UM evento (os demais cultos fixos não mudam). Só o administrador master (a RLS barra os demais). */
export async function alterarCulto(eventoId: string, dia: string, hora: string): Promise<Resultado> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(`${dia}T12:00:00Z`))) return { erro: "Data inválida" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { erro: "Horário inválido" };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("eventos")
    .update({ inicio: inicioNoFuso(dia, hora) })
    .eq("id", eventoId)
    .eq("so_agenda", false)
    .select("id");
  revalidatePath("/montar");
  revalidatePath("/");
  if (error || !data?.length) return { erro: "Não foi possível alterar esse culto (sem permissão ou não encontrado)." };
  return { erro: null, aviso: "Culto atualizado. Quem já estava escalado continua escalado nele." };
}

/**
 * Cancela UM culto: remove o evento (e as escalas dele) e, se for culto fixo, registra uma pausa de um dia
 * para o gerador não recriá-lo. Só o administrador master.
 */
export async function cancelarCulto(eventoId: string, motivo: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { data: ev } = await supabase.from("eventos").select("id, igreja_id, tipo_evento_id, inicio, ocorrencia").eq("id", eventoId).eq("so_agenda", false).maybeSingle();
  if (!ev) return { erro: "Culto não encontrado ou sem permissão." };
  if (ev.tipo_evento_id) {
    const dia = ev.ocorrencia ?? diaNoFuso(new Date(ev.inicio));
    const { error: erroPausa } = await supabase
      .from("pausas_cultos")
      .insert({ igreja_id: ev.igreja_id, tipo_evento_id: ev.tipo_evento_id, de: dia, ate: dia, motivo: motivo.trim().slice(0, 200) || null });
    if (erroPausa) return { erro: "Não foi possível cancelar agora." };
  }
  const { error } = await supabase.from("eventos").delete().eq("id", eventoId);
  revalidatePath("/montar");
  revalidatePath("/");
  return error ? { erro: "Não foi possível cancelar agora." } : { erro: null, aviso: "Culto cancelado. Para voltar atrás, remova a pausa em Cultos fixos e gere os cultos do mês." };
}

/** "Criar automático": (master) cria os cultos fixos do mês e preenche todas as vagas (rascunho; o coordenador revisa e publica). */
export async function criarAutomatico(ministerioId: string, mes: string): Promise<Resultado> {
  // Os cultos do mês só o master cria; o coordenador usa os que já existem
  const supabase = await criarClienteServidor();
  const { data: master } = await supabase.rpc("sou_admin_master");
  let cultos: Resultado = { erro: null };
  if (master) {
    cultos = await gerarCultos(mes);
    if (cultos.erro) return cultos;
  }
  const escala = await sugerir(ministerioId, mes);
  if (escala.erro) return escala;
  return {
    erro: null,
    aviso: `${cultos.aviso ?? ""} ${escala.aviso ?? ""} A escala está em rascunho: revise e toque em Publicar.`.trim(),
  };
}
