import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaInicio, type Linha } from "./tela-inicio";

const CAMPOS = "id, papel, status, motivo, eventos!inner(titulo, inicio), funcoes(nome), ministerios(nome)";

export default async function Inicio() {
  const supabase = await criarClienteServidor();
  const { data: pessoaId } = await supabase.rpc("vincular_conta");
  if (!pessoaId) redirect("/sem-cadastro");

  const agora = new Date().toISOString();
  const [{ data: pessoa }, { data: coordenador }, { data: futuras }, { data: passadas }] = await Promise.all([
    supabase.from("pessoas").select("nome").eq("id", pessoaId).single(),
    supabase.rpc("sou_coordenador_algum"),
    supabase
      .from("escalas")
      .select(CAMPOS)
      .eq("pessoa_id", pessoaId)
      .neq("status", "trocado")
      .gte("eventos.inicio", agora)
      .order("inicio", { referencedTable: "eventos" })
      .limit(20),
    supabase
      .from("escalas")
      .select(CAMPOS)
      .eq("pessoa_id", pessoaId)
      .lt("eventos.inicio", agora)
      .order("inicio", { referencedTable: "eventos", ascending: false })
      .limit(5),
  ]);

  // A ordenação por tabela relacionada não ordena as linhas principais; ordena aqui.
  const porData = (lista: Linha[], sentido: 1 | -1) =>
    lista.sort((a, b) => sentido * (+new Date(a.eventos.inicio) - +new Date(b.eventos.inicio)));
  const proximas = porData((futuras ?? []) as unknown as Linha[], 1);
  const historico = porData((passadas ?? []) as unknown as Linha[], -1);

  return (
    <TelaInicio nome={pessoa?.nome ?? ""} coordenador={!!coordenador} proximas={proximas} historico={historico} />
  );
}
