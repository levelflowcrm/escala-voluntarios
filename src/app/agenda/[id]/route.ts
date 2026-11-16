import { NextResponse } from "next/server";
import { montarIcs } from "@/lib/ics";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Baixa um .ics da minha escala (a RLS garante que só vejo o que é meu ou publicado). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) return new NextResponse("Não autorizado", { status: 401 });

  const { data: e } = await supabase
    .from("escalas")
    .select("id, papel, eventos!inner(titulo, inicio), funcoes(nome), ministerios(nome)")
    .eq("id", id)
    .eq("pessoa_id", eu)
    .maybeSingle();
  if (!e) return new NextResponse("Escala não encontrada", { status: 404 });

  const ev = e.eventos as unknown as { titulo: string; inicio: string };
  const funcao = (e.funcoes as unknown as { nome: string } | null)?.nome;
  const ministerio = (e.ministerios as unknown as { nome: string } | null)?.nome;
  const ics = montarIcs({
    id: e.id,
    titulo: `Servir: ${ev.titulo}${funcao ? ` · ${funcao}` : ""}`,
    inicio: ev.inicio,
    descricao: [ministerio && `Ministério: ${ministerio}`, funcao && `Função: ${funcao}`, "Escala pelo Culto360"].filter(Boolean).join("\n"),
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="escala.ics"',
    },
  });
}
