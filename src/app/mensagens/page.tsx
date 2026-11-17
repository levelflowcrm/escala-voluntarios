import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaMensagens, type Mensagem } from "./tela";

export default async function Mensagens() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const [{ data: master }, { data: lista }] = await Promise.all([
    supabase.rpc("sou_admin_master"),
    supabase
      .from("mensagens_app")
      .select("id, tipo, texto, pagina, status, criado_em, autor_id, pessoas(nome)")
      .order("criado_em", { ascending: false })
      .limit(200),
  ]);

  const todas: Mensagem[] = (lista ?? []).map((m) => ({
    id: m.id,
    tipo: m.tipo as Mensagem["tipo"],
    texto: m.texto,
    pagina: m.pagina,
    status: m.status as Mensagem["status"],
    criadoEm: m.criado_em,
    autor: (m.pessoas as unknown as { nome: string } | null)?.nome ?? "",
    minha: m.autor_id === eu,
  }));
  return <TelaMensagens master={!!master} mensagens={todas} />;
}
