import { redirect } from "next/navigation";
import { ministeriosQueCoordeno } from "@/lib/ministerios";
import { cultoSugerido, ordenarOcorrencias, type CultoOpcao, type Gravidade, type StatusOcorrencia, type TipoOcorrencia } from "@/lib/ocorrencias";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaOcorrencias, type Ocorrencia } from "./tela";

export const metadata = { title: "Ocorrências · Mais Conectados" };

export default async function Ocorrencias() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  // Cultos em que servi de 3 dias atrás até as próximas 12h: opções do formulário
  const desde = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const ate = new Date(Date.now() + 12 * 3_600_000).toISOString();
  const [{ data: membro }, { data: servi }, { data: lista }] = await Promise.all([
    supabase.from("membros_ministerio").select("ministerio_id, ministerios!inner(nome)").eq("pessoa_id", eu),
    supabase
      .from("escalas")
      .select("ministerio_id, eventos!inner(id, titulo, inicio)")
      .eq("pessoa_id", eu)
      .in("status", ["pendente", "confirmado"])
      .gte("eventos.inicio", desde)
      .lte("eventos.inicio", ate),
    supabase
      .from("ocorrencias")
      .select(
        "id, tipo, gravidade, texto, status, resposta, criado_em, tratado_em, autor_id, ministerio_id, ministerios!inner(nome), eventos(titulo, inicio), autor:pessoas!ocorrencias_autor_id_fkey(nome), tratador:pessoas!ocorrencias_tratado_por_fkey(nome)",
      )
      .order("criado_em", { ascending: false })
      .limit(100),
  ]);

  const ministerios = (membro ?? [])
    .map((m) => ({ id: m.ministerio_id as string, nome: (m.ministerios as unknown as { nome: string }).nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const cultos: CultoOpcao[] = (servi ?? [])
    .map((s) => {
      const ev = s.eventos as unknown as { id: string; titulo: string; inicio: string };
      return { eventoId: ev.id, ministerioId: s.ministerio_id as string, titulo: ev.titulo, inicio: ev.inicio };
    })
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const coordena = new Set((await ministeriosQueCoordeno(supabase, eu)).map((m) => m.id));

  const todas: Ocorrencia[] = (lista ?? []).map((o) => {
    const ev = o.eventos as unknown as { titulo: string; inicio: string } | null;
    return {
      id: o.id,
      tipo: o.tipo as TipoOcorrencia,
      gravidade: o.gravidade as Gravidade,
      texto: o.texto,
      status: o.status as StatusOcorrencia,
      resposta: o.resposta,
      criadoEm: o.criado_em,
      tratadoEm: o.tratado_em,
      ministerio: (o.ministerios as unknown as { nome: string }).nome,
      culto: ev ? { titulo: ev.titulo, inicio: ev.inicio } : null,
      autor: (o.autor as unknown as { nome: string } | null)?.nome ?? "",
      tratador: (o.tratador as unknown as { nome: string } | null)?.nome ?? null,
      recebida: coordena.has(o.ministerio_id) && o.autor_id !== eu,
    };
  });

  return (
    <TelaOcorrencias
      ministerios={ministerios}
      cultos={cultos}
      sugerido={cultoSugerido(cultos)?.eventoId ?? null}
      recebidas={ordenarOcorrencias(todas.filter((o) => o.recebida))}
      minhas={todas.filter((o) => !o.recebida)}
    />
  );
}
