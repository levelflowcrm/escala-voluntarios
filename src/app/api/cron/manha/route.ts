import { NextResponse } from "next/server";
import { clienteServico, despacharFila, MAX_POR_RODADA_CRON, whatsappAtivo } from "@/lib/whatsapp";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Rotina das 7h30 (Vercel Cron, 10:30 UTC): publica e avisa os repertórios programados para hoje,
 * enfileira o parabéns de quem faz aniversário hoje e envia a fila. Protegida por CRON_SECRET.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!whatsappAtivo()) return NextResponse.json({ ok: true, motivo: "desligado" });

  const db = clienteServico();
  if (!db) return NextResponse.json({ erro: "sem chave de serviço" }, { status: 500 });

  const { data: repertorios, error } = await db.rpc("enviar_repertorios_programados");
  // Falha no aniversário não impede o envio da fila
  const { data: aniversarios } = await db.rpc("enfileirar_aniversarios");
  const r = await despacharFila(MAX_POR_RODADA_CRON);
  return NextResponse.json({ ok: !error, repertorios: repertorios ?? 0, aniversarios: aniversarios ?? 0, enviados: r.enviados, ...(r.motivo ? { motivo: r.motivo } : {}) });
}
