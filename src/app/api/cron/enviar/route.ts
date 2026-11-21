import { NextResponse } from "next/server";
import { despacharFila, MAX_POR_RODADA_CRON, ORCAMENTO_CRON_MS } from "@/lib/whatsapp";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Envia a fila do WhatsApp. Chamada a cada 10 minutos pelo agendador do Supabase (pg_cron),
 * com a mesma senha das outras rotinas (CRON_SECRET). Silêncio noturno, tetos e ritmo ficam em despacharFila.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const r = await despacharFila(MAX_POR_RODADA_CRON, ORCAMENTO_CRON_MS);
  return NextResponse.json({ ok: true, enviados: r.enviados, ...(r.motivo ? { motivo: r.motivo } : {}) });
}
