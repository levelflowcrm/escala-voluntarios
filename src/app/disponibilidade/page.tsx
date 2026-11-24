import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { dadosDisponibilidade } from "@/lib/disponibilidade-dados";
import { proximoMes } from "@/lib/disponibilidade-mes";
import { TelaDisponibilidade } from "./tela";

export default async function Disponibilidade() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const dados = await dadosDisponibilidade(supabase, eu);
  const prox = proximoMes(dados.hoje);
  const { data: informado } = await supabase.from("disponibilidade_informada").select("mes").eq("mes", prox.mes).maybeSingle();

  return <TelaDisponibilidade dados={dados} mesParaConfirmar={informado ? null : prox.nome} />;
}
