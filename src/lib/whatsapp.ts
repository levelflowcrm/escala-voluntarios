import { createClient } from "@supabase/supabase-js";
import { despacharPush } from "./push";

/** Limites de segurança: pouco volume, nada de enxurrada. */
export const MAX_POR_RODADA = 10; // envio na hora, logo depois de uma ação no app
export const MAX_POR_RODADA_CRON = 30; // rotinas agendadas (a cada 10 min e as diárias)
export const MAX_POR_PESSOA_DIA = 4;
export const MAX_TOTAL_DIA = 300; // teto de mensagens por 24h, somando todo mundo (protege o número)
export const VALIDADE_HORAS = 12; // padrão quando a mensagem não tem validade própria
export const MAX_TENTATIVAS = 3;
export const SILENCIO = { das: 22, ate: 7 }; // nada sai entre 22h e 7h (horário de São Paulo)
const PAUSA_MIN_MS = 1000;
const PAUSA_MAX_MS = 3000;
const RESERVA_MIN = 5; // uma mensagem reservada por uma rotina fica 5 min fora do alcance das outras
export const ORCAMENTO_ACAO_MS = 20_000; // tempo máximo enviando depois de uma ação no app
export const ORCAMENTO_CRON_MS = 45_000; // tempo máximo de uma rotina agendada (limite da Vercel: 60 s)

/** Interruptor geral: só envia com WHATSAPP_ATIVO=true. Qualquer outro valor desliga tudo. */
export function whatsappAtivo(env: Record<string, string | undefined> = process.env): boolean {
  return env.WHATSAPP_ATIVO === "true";
}

/** "(11) 95402-4089" → "5511954024089". Devolve null se não parecer um celular brasileiro (DDD + 9 + 8 dígitos). */
export function normalizarNumero(celular: string | null | undefined): string | null {
  let d = (celular ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  d = d.replace(/^0+/, ""); // "0" de chamada interurbana
  // Nacional: DDD (11–99) + celular. 11 dígitos começam com 9; 10 dígitos são números antigos (sem o 9).
  const ok = /^[1-9][1-9]9\d{8}$/.test(d) || /^[1-9][1-9][6-9]\d{7}$/.test(d);
  return ok ? `55${d}` : null;
}

export type ItemFila = {
  id: string;
  pessoa_id: string;
  texto: string;
  criado_em: string;
  celular: string | null;
  valido_ate?: string | null;
};

/** Horário de silêncio (22h–7h em São Paulo): a fila espera e sai de manhã. */
export function emSilencio(agora: Date): boolean {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(agora),
  );
  return hora >= SILENCIO.das || hora < SILENCIO.ate;
}

/** Pausa aleatória entre mensagens: ritmo menos "robótico". */
export function pausaAleatoria(sorteio = Math.random()): number {
  return Math.round(PAUSA_MIN_MS + sorteio * (PAUSA_MAX_MS - PAUSA_MIN_MS));
}

/**
 * Escolhe o que enviar agora (os itens já chegam na ordem de prioridade): descarta o que venceu,
 * respeita o teto por pessoa/dia, o teto total do dia e o teto da rodada.
 * `enviadosHoje` = quantas mensagens cada pessoa recebeu nas últimas 24h; `totalHoje` = soma de todos.
 */
export function escolherEnviaveis(
  itens: ItemFila[],
  enviadosHoje: Record<string, number>,
  agora: Date,
  limite: number,
  totalHoje = 0,
): { enviar: ItemFila[]; expirados: string[] } {
  const corte = agora.getTime() - VALIDADE_HORAS * 3600_000;
  const contagem = { ...enviadosHoje };
  const enviar: ItemFila[] = [];
  const expirados: string[] = [];
  const vagasNoDia = Math.max(0, MAX_TOTAL_DIA - totalHoje);
  for (const it of itens) {
    const vencida = it.valido_ate ? new Date(it.valido_ate).getTime() <= agora.getTime() : new Date(it.criado_em).getTime() < corte;
    if (vencida) {
      expirados.push(it.id);
      continue;
    }
    if (enviar.length >= limite || enviar.length >= vagasNoDia) continue;
    if ((contagem[it.pessoa_id] ?? 0) >= MAX_POR_PESSOA_DIA) continue;
    if (!normalizarNumero(it.celular)) continue;
    contagem[it.pessoa_id] = (contagem[it.pessoa_id] ?? 0) + 1;
    enviar.push(it);
  }
  return { enviar, expirados };
}

/** Cliente com chave de serviço (só no servidor; ignora a RLS). Nunca importar em código de navegador. */
export function clienteServico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function enviarTexto(numero: string, texto: string): Promise<{ ok: boolean; erro?: string }> {
  const base = process.env.UAZAPI_URL?.trim().replace(/\/+$/, "");
  const token = process.env.UAZAPI_TOKEN?.trim();
  if (!base || !token) return { ok: false, erro: "uazapi_nao_configurada" };
  try {
    const r = await fetch(`${base}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: numero, text: texto, async: true }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? { ok: true } : { ok: false, erro: `http_${r.status}` };
  } catch (e) {
    // Só o tipo da falha (ex.: TimeoutError, TypeError, ENOTFOUND): nunca URL, token nem telefone.
    const nome = e instanceof Error ? e.name : "desconhecido";
    const causa = (e as { cause?: { code?: string; message?: string } })?.cause;
    const detalhe = String(causa?.code ?? causa?.message ?? (e instanceof Error ? e.message : "")).replace(/https?:\/\/\S+/g, "").slice(0, 60);
    return { ok: false, erro: `falha_de_rede:${nome}:${detalhe}`.slice(0, 120) };
  }
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Envia o que está na fila (respeitando interruptor, silêncio noturno e limites). Nunca lança erro:
 * aviso por WhatsApp não pode derrubar a ação do usuário. Não registra token nem telefone em log.
 * Para em `limite` mensagens ou quando o tempo (`orcamentoMs`) acaba; o resto sai na próxima rodada.
 */
export async function despacharFila(
  limite: number = MAX_POR_RODADA,
  orcamentoMs: number = ORCAMENTO_ACAO_MS,
): Promise<{ enviados: number; motivo?: string }> {
  const comeco = Date.now();
  try {
    const db = clienteServico();
    // Push do app: segue a mesma fila, mas não depende do interruptor do WhatsApp (tem o próprio, pelas chaves VAPID).
    if (db) await despacharPush(db);
    if (!whatsappAtivo()) return { enviados: 0, motivo: "desligado" };
    if (emSilencio(new Date())) return { enviados: 0, motivo: "silencio" };
    if (!db) return { enviados: 0, motivo: "sem_chave_de_servico" };

    const reservaVencida = new Date(Date.now() - RESERVA_MIN * 60_000).toISOString();
    const { data: pendentes, error: erroFila } = await db
      .from("fila_whatsapp")
      .select("id, pessoa_id, texto, criado_em, valido_ate")
      .is("enviado_em", null)
      .lt("tentativas", MAX_TENTATIVAS)
      .or(`reservado_em.is.null,reservado_em.lt.${reservaVencida}`)
      .order("prioridade", { ascending: true })
      .order("criado_em", { ascending: true })
      .limit(200);
    if (erroFila) return { enviados: 0, motivo: "erro_ao_ler_fila" };
    if (!pendentes?.length) return { enviados: 0 };

    const { data: pessoas, error: erroPessoas } = await db
      .from("pessoas")
      .select("id, celular")
      .in("id", [...new Set(pendentes.map((p) => p.pessoa_id))]);
    if (erroPessoas) return { enviados: 0, motivo: "erro_ao_ler_celulares" };
    const celularDe = new Map((pessoas ?? []).map((p) => [p.id as string, (p.celular as string | null) ?? null]));

    const inicioDia = new Date();
    inicioDia.setHours(inicioDia.getHours() - 24);
    const { data: recentes } = await db.from("fila_whatsapp").select("pessoa_id").not("enviado_em", "is", null).gte("enviado_em", inicioDia.toISOString());
    const enviadosHoje: Record<string, number> = {};
    for (const x of recentes ?? []) enviadosHoje[x.pessoa_id] = (enviadosHoje[x.pessoa_id] ?? 0) + 1;

    const itens: ItemFila[] = pendentes.map((p) => ({
      id: p.id,
      pessoa_id: p.pessoa_id,
      texto: p.texto,
      criado_em: p.criado_em,
      valido_ate: p.valido_ate,
      celular: celularDe.get(p.pessoa_id) ?? null,
    }));
    const { enviar, expirados } = escolherEnviaveis(itens, enviadosHoje, new Date(), limite, (recentes ?? []).length);

    if (expirados.length) await db.from("fila_whatsapp").update({ tentativas: 99, erro: "expirado" }).in("id", expirados);

    let enviados = 0;
    for (const it of enviar) {
      // Sem tempo para mais uma (envio + pausa máxima)? Para aqui; o resto sai na próxima rodada.
      if (Date.now() - comeco > orcamentoMs - (8000 + PAUSA_MAX_MS)) break;
      // Reserva: se outra rotina pegou esta mensagem há pouco, pula (nunca envia em dobro).
      const { data: minha } = await db
        .from("fila_whatsapp")
        .update({ reservado_em: new Date().toISOString() })
        .eq("id", it.id)
        .is("enviado_em", null)
        .or(`reservado_em.is.null,reservado_em.lt.${reservaVencida}`)
        .select("id");
      if (!minha?.length) continue;

      const numero = normalizarNumero(it.celular)!;
      const r = await enviarTexto(numero, it.texto);
      if (r.ok) {
        await db.from("fila_whatsapp").update({ enviado_em: new Date().toISOString(), erro: null }).eq("id", it.id);
        enviados++;
      } else {
        const { data: atual } = await db.from("fila_whatsapp").select("tentativas").eq("id", it.id).single();
        await db
          .from("fila_whatsapp")
          .update({ tentativas: (atual?.tentativas ?? 0) + 1, erro: r.erro, reservado_em: null })
          .eq("id", it.id);
      }
      await dormir(pausaAleatoria());
    }
    return { enviados };
  } catch {
    return { enviados: 0, motivo: "erro" };
  }
}
