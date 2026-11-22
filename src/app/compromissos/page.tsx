import { redirect } from "next/navigation";
import { ministeriosQueCoordeno } from "@/lib/ministerios";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaCompromissos, type Compromisso } from "./tela";

export const metadata = { title: "Compromissos do time · Mais Conectados" };

export default async function Compromissos() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  // A RLS devolve só os compromissos dos times de que a pessoa faz parte (ou coordena).
  const desde = new Date(Date.now() - 3 * 3_600_000).toISOString();
  const [{ data: lista }, coordeno] = await Promise.all([
    supabase
      .from("compromissos_time")
      .select("id, tipo, inicio, local, observacao, ministerio_id, ministerios!inner(nome), pessoas(nome)")
      .gte("inicio", desde)
      .order("inicio")
      .limit(100),
    ministeriosQueCoordeno(supabase, eu),
  ]);
  const meus = new Set(coordeno.map((m) => m.id));

  const compromissos: Compromisso[] = (lista ?? []).map((c) => ({
    id: c.id,
    tipo: c.tipo,
    inicio: c.inicio,
    local: c.local,
    observacao: c.observacao,
    ministerio: (c.ministerios as unknown as { nome: string }).nome,
    criadoPor: (c.pessoas as unknown as { nome: string } | null)?.nome ?? null,
    possoCancelar: meus.has(c.ministerio_id),
  }));
  return <TelaCompromissos ministerios={coordeno} compromissos={compromissos} />;
}
