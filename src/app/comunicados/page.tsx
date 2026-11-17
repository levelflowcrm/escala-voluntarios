import { redirect } from "next/navigation";
import { ministeriosQueCoordeno } from "@/lib/ministerios";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaComunicados, type Chegada, type Comunicado } from "./tela";

export default async function Comunicados() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const [{ data: lista }, meus, { data: leitura }] = await Promise.all([
    supabase
      .from("comunicados")
      .select("id, titulo, texto, criado_em, ministerios!inner(nome), pessoas(nome)")
      .order("criado_em", { ascending: false })
      .limit(50),
    ministeriosQueCoordeno(supabase, eu),
    supabase.from("leituras_comunicados").select("visto_em").eq("pessoa_id", eu).maybeSingle(),
  ]);

  const comunicados: Comunicado[] = (lista ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    texto: c.texto,
    criadoEm: c.criado_em,
    ministerio: (c.ministerios as unknown as { nome: string }).nome,
    autor: (c.pessoas as unknown as { nome: string } | null)?.nome ?? "",
  }));
  const ministerios = meus;
  let chegadas: Chegada[] = [];
  if (ministerios.length > 0) {
    const { data: ch } = await supabase.rpc("chegadas_do_dia");
    chegadas = ((ch ?? []) as Record<string, string | null>[]).map((c) => ({
      id: c.escala_id as string,
      pessoa: c.pessoa as string,
      funcao: c.funcao ?? "",
      ministerio: c.ministerio as string,
      evento: c.evento as string,
      inicio: c.inicio as string,
      chegouEm: c.chegou_em,
    }));
  }
  return <TelaComunicados chegadas={chegadas} comunicados={comunicados} ministerios={ministerios} vistoEm={leitura?.visto_em ?? new Date(Date.now() - 14 * 86_400_000).toISOString()} />;
}
