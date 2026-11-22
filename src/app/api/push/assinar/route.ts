import { NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Guarda o aparelho de quem está logado para receber avisos por push (a assinatura vem do navegador). */
export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  const endpoint = corpo?.endpoint;
  const p256dh = corpo?.keys?.p256dh;
  const auth = corpo?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 400 });
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_push", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_agente: req.headers.get("user-agent"),
  });
  if (error) return NextResponse.json({ erro: "não foi possível ativar" }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}

/** Remove o aparelho (a pessoa desligou os avisos). */
export async function DELETE(req: Request) {
  const corpo = await req.json().catch(() => null);
  if (typeof corpo?.endpoint !== "string") return NextResponse.json({ erro: "assinatura inválida" }, { status: 400 });
  const supabase = await criarClienteServidor();
  await supabase.rpc("remover_push", { p_endpoint: corpo.endpoint });
  return new NextResponse(null, { status: 204 });
}
