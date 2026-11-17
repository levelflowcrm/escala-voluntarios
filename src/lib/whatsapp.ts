import { createClient } from "@supabase/supabase-js";

/** Limites de segurança: pouco volume, nada de enxurrada. */
export const MAX_POR_RODADA = 10;
export const MAX_POR_RODADA_CRON = 30;
export const MAX_POR_PESSOA_DIA = 4;
export const VALIDADE_HORAS = 12;
export const MAX_TENTATIVAS = 3;
const PAUSA_ENTRE_ENVIOS_MS = 600;

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

export type ItemFila = { id: string; pessoa_id: string; texto: string; criado_em: string; celular: string | null };

/**
 * Escolhe o que enviar agora: descarta o que já venceu, respeita o teto por pessoa/dia e o teto da rodada.
 * `enviadosHoje` = quantas mensagens cada pessoa já recebeu hoje.
 */
export function escolherEnviaveis(
  itens: ItemFila[],
  enviadosHoje: Record<string, number>,
  agora: Date,
  limite: number,
): { enviar: ItemFila[]; expirados: string[] } {
  const corte = agora.getTime() - VALIDADE_HORAS * 3600_000;
  const contagem = { ...enviadosHoje };
  const enviar: ItemFila[] = [];
  const expirados: string[] = [];
  for (const it of itens) {
    if (new Date(it.criado_em).getTime() < corte) {
      expirados.push(it.id);
      continue;
    }
    if (enviar.length >= limite) continue;
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
 * Envia o que está na fila (respeitando interruptor e limites). Nunca lança erro: aviso por WhatsApp
 * não pode derrubar a ação do usuário. Não registra token nem telefone em log.
 */
export async function despacharFila(limite: number = MAX_POR_RODADA): Promise<{ enviados: number; motivo?: string }> {
  try {
    if (!whatsappAtivo()) return { enviados: 0, motivo: "desligado" };
    const db = clienteServico();
    if (!db) return { enviados: 0, motivo: "sem_chave_de_servico" };

    const { data: pendentes, error: erroFila } = await db
      .from("fila_whatsapp")
      .select("id, pessoa_id, texto, criado_em")
      .is("enviado_em", null)
      .lt("tentativas", MAX_TENTATIVAS)
      .order("criado_em", { ascending: true })
      .limit(100);
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
      celular: celularDe.get(p.pessoa_id) ?? null,
    }));
    const { enviar, expirados } = escolherEnviaveis(itens, enviadosHoje, new Date(), limite);

    if (expirados.length) await db.from("fila_whatsapp").update({ tentativas: 99, erro: "expirado" }).in("id", expirados);

    let enviados = 0;
    for (const it of enviar) {
      const numero = normalizarNumero(it.celular)!;
      const r = await enviarTexto(numero, it.texto);
      if (r.ok) {
        await db.from("fila_whatsapp").update({ enviado_em: new Date().toISOString(), erro: null }).eq("id", it.id);
        enviados++;
      } else {
        const { data: atual } = await db.from("fila_whatsapp").select("tentativas").eq("id", it.id).single();
        await db.from("fila_whatsapp").update({ tentativas: (atual?.tentativas ?? 0) + 1, erro: r.erro }).eq("id", it.id);
      }
      await dormir(PAUSA_ENTRE_ENVIOS_MS);
    }
    return { enviados };
  } catch {
    return { enviados: 0, motivo: "erro" };
  }
}
