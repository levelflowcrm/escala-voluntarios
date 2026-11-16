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

  const { data } = await supabase
    .from("membros_ministerio")
    .select("pessoas!inner(id, nome, email, auth_user_id, ativo)")
    .in("ministerio_id", ids);

  const vistos = new Set<string>();
  const lista: Voluntario[] = [];
  for (const m of data ?? []) {
    const p = m.pessoas as unknown as { id: string; nome: string; email: string | null; auth_user_id: string | null; ativo: boolean };
    if (!p.ativo || vistos.has(p.id)) continue;
    vistos.add(p.id);
    lista.push({ id: p.id, nome: p.nome, email: p.email ?? "", conectado: !!p.auth_user_id });
  }
  lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return <TelaVoluntarios voluntarios={lista} />;
}
