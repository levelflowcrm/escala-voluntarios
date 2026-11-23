import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emSilencio } from "./whatsapp";

/** Avisos do nível 1 (docs/AVISOS.md): os mesmos da fila do WhatsApp que também saem por push. */
export const TIPOS_PUSH = ["publicada", "lembrete", "vaga_aberta", "troca", "chegada", "ocorrencia"] as const;
export type TipoPush = (typeof TIPOS_PUSH)[number];

const DESTINOS: Record<TipoPush, { titulo: string; url: string }> = {
  publicada: { titulo: "Nova escala", url: "/" },
  lembrete: { titulo: "Lembrete de escala", url: "/" },
  vaga_aberta: { titulo: "Vaga aberta", url: "/vagas" },
  troca: { titulo: "Troca de escala", url: "/" },
  chegada: { titulo: "Chegou ao culto", url: "/" },
  ocorrencia: { titulo: "Nova ocorrência", url: "/ocorrencias" },
};

/** Avisos que ficam na tabela notificacoes (sino do app): só push, sem WhatsApp. */
const TITULOS_NOTIFICACAO: Record<string, string> = {
  novo_ministerio: "Novo ministério no time",
  novo_ministerio_voluntario: "Novo ministério",
  escalado_outro_ministerio: "Escala em outro ministério",
};

const VALIDADE_HORAS = 12;
const MAX_POR_RODADA = 100;
const MAX_CORPO = 180;

export type MensagemPush = { titulo: string; corpo: string; url: string; tag: string };

/** Transforma o texto do WhatsApp (com *negrito*, emojis e links) em um push curto. */
export function montarMensagemPush(tipo: string, texto: string, id: string): MensagemPush | null {
  if (!(TIPOS_PUSH as readonly string[]).includes(tipo)) return null;
  const d = DESTINOS[tipo as TipoPush];
  const limpo = texto
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const corpo = limpo.length > MAX_CORPO ? `${limpo.slice(0, MAX_CORPO - 1).trimEnd()}…` : limpo;
  return { titulo: d.titulo, corpo, url: d.url, tag: `${tipo}:${id}` };
}

/** Monta o push de um aviso do app (notificacoes). Devolve null para tipos sem push. */
export function montarMensagemNotificacao(tipo: string, texto: string, url: string, id: string): MensagemPush | null {
  const titulo = TITULOS_NOTIFICACAO[tipo];
  if (!titulo) return null;
  const limpo = texto.replace(/\s+/g, " ").trim();
  const corpo = limpo.length > MAX_CORPO ? `${limpo.slice(0, MAX_CORPO - 1).trimEnd()}…` : limpo;
  return { titulo, corpo, url: url.startsWith("/") ? url : "/", tag: `${tipo}:${id}` };
}

export function pushConfigurado(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

type Assinatura = { id: string; pessoa_id: string; endpoint: string; p256dh: string; auth: string };
type ItemPush = { id: string; pessoa_id: string; tipo: string; texto: string; criado_em: string; valido_ate: string | null };

/**
 * Envia por push os avisos do nível 1 que estão na fila e ainda não foram por push.
 * Respeita o silêncio noturno e a validade da mensagem; só considera quem ativou os avisos no aparelho.
 * Nunca lança erro e não registra endpoint, chave nem texto em log.
 */
export async function despacharPush(db: SupabaseClient): Promise<{ enviados: number; motivo?: string }> {
  try {
    if (!pushConfigurado()) return { enviados: 0, motivo: "push_desligado" };
    if (emSilencio(new Date())) return { enviados: 0, motivo: "silencio" };

    const { data: assinaturas } = await db.from("push_assinaturas").select("id, pessoa_id, endpoint, p256dh, auth");
    const lista = (assinaturas ?? []) as Assinatura[];
    if (!lista.length) return { enviados: 0 };
    const porPessoa = new Map<string, Assinatura[]>();
    for (const a of lista) porPessoa.set(a.pessoa_id, [...(porPessoa.get(a.pessoa_id) ?? []), a]);

    const agora = new Date();
    const corte = new Date(agora.getTime() - VALIDADE_HORAS * 3600_000).toISOString();
    const { data: itens, error } = await db
      .from("fila_whatsapp")
      .select("id, pessoa_id, tipo, texto, criado_em, valido_ate")
      .is("push_enviado_em", null)
      .in("tipo", [...TIPOS_PUSH])
      .in("pessoa_id", [...porPessoa.keys()])
      .gte("criado_em", corte)
      .order("prioridade", { ascending: true })
      .order("criado_em", { ascending: true })
      .limit(MAX_POR_RODADA);
    if (error) return { enviados: 0 };

    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

    let enviados = 0;

    // Manda a mensagem para todos os aparelhos da pessoa; apaga o que o aparelho cancelou (404/410).
    const enviarPara = async (pessoaId: string, msg: MensagemPush): Promise<boolean> => {
      let algumOk = false;
      for (const a of porPessoa.get(pessoaId) ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            JSON.stringify(msg),
            { TTL: 6 * 3600, urgency: "high", timeout: 8000 },
          );
          algumOk = true;
          await db.from("push_assinaturas").update({ ultimo_ok_em: new Date().toISOString() }).eq("id", a.id);
        } catch (e) {
          const status = (e as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) await db.from("push_assinaturas").delete().eq("id", a.id);
        }
      }
      return algumOk;
    };

    for (const it of (itens ?? []) as ItemPush[]) {
      if (it.valido_ate && new Date(it.valido_ate).getTime() <= agora.getTime()) {
        await db.from("fila_whatsapp").update({ push_enviado_em: agora.toISOString() }).eq("id", it.id);
        continue;
      }
      const msg = montarMensagemPush(it.tipo, it.texto, it.id);
      if (!msg) continue;
      if (await enviarPara(it.pessoa_id, msg)) {
        await db.from("fila_whatsapp").update({ push_enviado_em: new Date().toISOString() }).eq("id", it.id);
        enviados++;
      }
    }

    // Avisos do app (sino) que também saem por push.
    const { data: avisos } = await db
      .from("notificacoes")
      .select("id, pessoa_id, tipo, texto, url")
      .is("push_enviado_em", null)
      .in("tipo", Object.keys(TITULOS_NOTIFICACAO))
      .in("pessoa_id", [...porPessoa.keys()])
      .gte("criado_em", corte)
      .order("criado_em", { ascending: true })
      .limit(MAX_POR_RODADA);
    for (const n of (avisos ?? []) as { id: string; pessoa_id: string; tipo: string; texto: string; url: string }[]) {
      const msg = montarMensagemNotificacao(n.tipo, n.texto, n.url, n.id);
      if (!msg) continue;
      if (await enviarPara(n.pessoa_id, msg)) {
        await db.from("notificacoes").update({ push_enviado_em: new Date().toISOString() }).eq("id", n.id);
        enviados++;
      }
    }
    return { enviados };
  } catch {
    return { enviados: 0, motivo: "erro" };
  }
}
