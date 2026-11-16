import type { criarClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Ministérios que a pessoa coordena. Administrador coordena todos os da igreja. */
export async function ministeriosQueCoordeno(supabase: Cliente, pessoaId: string): Promise<{ id: string; nome: string }[]> {
  const { data: admin } = await supabase.rpc("sou_admin");
  const { data } = admin
    ? await supabase.from("ministerios").select("id, nome")
    : await supabase
        .from("membros_ministerio")
        .select("id:ministerio_id, ministerios!inner(nome)")
        .eq("pessoa_id", pessoaId)
        .eq("papel", "coordenador");
  const lista = admin
    ? ((data ?? []) as { id: string; nome: string }[])
    : ((data ?? []) as unknown as { id: string; ministerios: { nome: string } }[]).map((m) => ({ id: m.id, nome: m.ministerios.nome }));
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
