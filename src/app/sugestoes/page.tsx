import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaSugestoes, type Sugestao } from "./tela";

export default async function Sugestoes() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const [{ data: membro }, { data: lista }] = await Promise.all([
    supabase.from("membros_ministerio").select("papel, ministerio_id, ministerios!inner(nome)").eq("pessoa_id", eu),
    supabase
      .from("sugestoes")
      .select("id, texto, anonima, status, criado_em, ministerio_id, ministerios!inner(nome), pessoas(nome)")
      .order("criado_em", { ascending: false })
      .limit(100),
  ]);

  const ministerios = (membro ?? []).map((m) => ({
    id: m.ministerio_id as string,
    nome: (m.ministerios as unknown as { nome: string }).nome,
    coordenador: m.papel === "coordenador",
  }));
  const coordena = new Set(ministerios.filter((m) => m.coordenador).map((m) => m.id));

  const todas: Sugestao[] = (lista ?? []).map((s) => ({
    id: s.id,
    texto: s.texto,
    status: s.status as Sugestao["status"],
    criadoEm: s.criado_em,
    ministerio: (s.ministerios as unknown as { nome: string }).nome,
    autor: s.anonima ? "Anônimo" : ((s.pessoas as unknown as { nome: string } | null)?.nome ?? ""),
    recebida: coordena.has(s.ministerio_id),
  }));
  return <TelaSugestoes ministerios={ministerios.map(({ id, nome }) => ({ id, nome }))} sugestoes={todas} />;
}
