import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Volta do link por e-mail ou do Google: abre a sessão e liga a conta ao cadastro. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: pessoa } = await supabase.rpc("vincular_conta");
      return NextResponse.redirect(`${origin}${pessoa ? "/" : "/sem-cadastro"}`);
    }
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link`);
}
