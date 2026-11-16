import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaComunicados, type Comunicado } from "./tela";

export default async function Comunicados() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const [{ data: lista }, { data: meus }] = await Promise.all([
    supabase
      .from("comunicados")
      .select("id, titulo, texto, criado_em, ministerios!inner(nome), pessoas(nome)")
      .order("criado_em", { ascending: false })
      .limit(50),
    supabase
      .from("membros_ministerio")
      .select("ministerio_id, ministerios!inner(nome)")
      .eq("pessoa_id", eu)
      .eq("papel", "coordenador"),
  ]);

  const comunicados: Comunicado[] = (lista ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    texto: c.texto,
    criadoEm: c.criado_em,
    ministerio: (c.ministerios as unknown as { nome: string }).nome,
    autor: (c.pessoas as unknown as { nome: string } | null)?.nome ?? "",
  }));
  const ministerios = (meus ?? []).map((m) => ({
    id: m.ministerio_id as string,
    nome: (m.ministerios as unknown as { nome: string }).nome,
  }));
  return <TelaComunicados comunicados={comunicados} ministerios={ministerios} />;
}
