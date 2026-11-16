import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaVoluntarios, type Voluntario } from "./tela";

export default async function Voluntarios() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const { data: meus } = await supabase
    .from("membros_ministerio")
    .select("ministerio_id")
    .eq("pessoa_id", eu)
    .eq("papel", "coordenador");
  const ids = (meus ?? []).map((m) => m.ministerio_id as string);
  if (ids.length === 0) redirect("/");

  const { data } = await supabase.rpc("dados_do_time");
  const lista: Voluntario[] = ((data ?? []) as { pessoa_id: string; nome: string; email: string | null; conectado: boolean }[]).map((p) => ({
    id: p.pessoa_id,
    nome: p.nome,
    email: p.email ?? "",
    conectado: p.conectado,
  }));
  lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return <TelaVoluntarios voluntarios={lista} />;
}
