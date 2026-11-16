import { NextResponse } from "next/server";
import { montarIcs } from "@/lib/ics";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Baixa o .ics de um evento da agenda da igreja (qualquer pessoa logada). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return new NextResponse("Não autorizado", { status: 401 });
  const { data: e } = await supabase
    .from("eventos")
    .select("id, titulo, inicio, fim, local, observacao")
    .eq("id", id)
    .eq("so_agenda", true)
    .maybeSingle();
  if (!e) return new NextResponse("Evento não encontrado", { status: 404 });
  const duracaoMin = e.fim ? Math.round((new Date(e.fim).getTime() - new Date(e.inicio).getTime()) / 60_000) : undefined;
  const ics = montarIcs({
    id: e.id,
    titulo: e.titulo,
    inicio: e.inicio,
    duracaoMin,
    descricao: [e.local && `Local: ${e.local}`, e.observacao].filter(Boolean).join("\n") || undefined,
  });
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="evento.ics"' },
  });
}
