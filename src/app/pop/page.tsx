import { redirect } from "next/navigation";
import { ministeriosQueCoordeno } from "@/lib/ministerios";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaPop, type PopDoTime } from "./tela";

export const metadata = { title: "POP do time · Mais Conectados" };

export default async function Pop() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const [{ data: membro }, { data: pops }, coordeno] = await Promise.all([
    supabase.from("membros_ministerio").select("ministerio_id, ministerios!inner(nome)").eq("pessoa_id", eu),
    supabase.from("pop_ministerio").select("ministerio_id, conteudo, link, atualizado_em, pessoas:atualizado_por(nome)"),
    ministeriosQueCoordeno(supabase, eu),
  ]);

  const editaveis = new Set(coordeno.map((m) => m.id));
  const nomes = new Map<string, string>();
  for (const m of membro ?? []) nomes.set(m.ministerio_id as string, (m.ministerios as unknown as { nome: string }).nome);
  for (const m of coordeno) nomes.set(m.id, m.nome);

  const porMin = new Map((pops ?? []).map((p) => [p.ministerio_id as string, p]));
  const times: PopDoTime[] = [...nomes.entries()]
    .map(([id, nome]) => {
      const p = porMin.get(id);
      return {
        ministerioId: id,
        nome,
        conteudo: p?.conteudo ?? "",
        link: p?.link ?? "",
        atualizadoEm: p?.atualizado_em ?? null,
        atualizadoPor: (p?.pessoas as unknown as { nome: string } | null)?.nome ?? null,
        podeEditar: editaveis.has(id),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return <TelaPop times={times} />;
}
