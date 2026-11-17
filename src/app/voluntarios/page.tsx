import { redirect } from "next/navigation";
import { ministeriosQueCoordeno } from "@/lib/ministerios";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaVoluntarios, type Voluntario } from "./tela";
import type { AreaFuncoes } from "./habilidades";
import type { NivelHab } from "./acoes";

export default async function Voluntarios() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const ids = await ministeriosQueCoordeno(supabase, eu);
  if (ids.length === 0) redirect("/");

  const { data } = await supabase.rpc("dados_do_time");
  const lista: Voluntario[] = ((data ?? []) as { pessoa_id: string; nome: string; email: string | null; conectado: boolean; celular: string | null }[]).map((p) => ({
    id: p.pessoa_id,
    nome: p.nome,
    email: p.email ?? "",
    conectado: p.conectado,
    celular: p.celular ?? "",
  }));
  lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // Áreas que eu coordeno com suas funções, e o nível de cada pessoa em cada função
  const idsAreas = ids.map((m) => m.id);
  const [{ data: funcoes }, { data: habs }] = await Promise.all([
    supabase.from("funcoes").select("id, nome, ministerio_id").in("ministerio_id", idsAreas).eq("ativo", true).order("ordem"),
    supabase.from("habilitacoes").select("pessoa_id, funcao_id, nivel").in("pessoa_id", lista.map((v) => v.id)),
  ]);
  const areas: AreaFuncoes[] = ids.map((m) => ({
    id: m.id,
    nome: m.nome,
    funcoes: (funcoes ?? []).filter((f) => f.ministerio_id === m.id).map((f) => ({ id: f.id, nome: f.nome })),
  }));
  const habilidades: Record<string, Record<string, NivelHab>> = {};
  for (const h of habs ?? []) (habilidades[h.pessoa_id] ??= {})[h.funcao_id] = h.nivel as NivelHab;

  return <TelaVoluntarios voluntarios={lista} areas={areas} habilidades={habilidades} />;
}
