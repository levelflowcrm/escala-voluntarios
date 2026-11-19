import { NextResponse } from "next/server";
import { clienteServico, despacharFila, MAX_POR_RODADA_CRON, whatsappAtivo } from "@/lib/whatsapp";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Rotina das 9h (Vercel Cron, 12:00 UTC): parabéns por WhatsApp a quem faz aniversário hoje e envio da fila. Protegida por CRON_SECRET. */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!whatsappAtivo()) return NextResponse.json({ ok: true, motivo: "desligado" });

  const db = clienteServico();
  if (!db) return NextResponse.json({ erro: "sem chave de serviço" }, { status: 500 });

  const { data: aniversarios, error } = await db.rpc("enfileirar_aniversarios");
  const r = await despacharFila(MAX_POR_RODADA_CRON);
  return NextResponse.json({ ok: !error, aniversarios: aniversarios ?? 0, enviados: r.enviados, ...(r.motivo ? { motivo: r.motivo } : {}) });
}
