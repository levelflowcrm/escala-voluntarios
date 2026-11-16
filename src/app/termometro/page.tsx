import { redirect } from "next/navigation";
import { mesAtual } from "@/lib/datas";
import { aniversariantesDoMes, classificarCarga, type Carga } from "@/lib/termometro";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaTermometro } from "./tela";

export default async function Termometro() {
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

  const { data: membros } = await supabase
    .from("membros_ministerio")
    .select("pessoas!inner(id, nome, aniversario, ativo)")
    .in("ministerio_id", ids);
  const time = new Map<string, { nome: string; aniversario: string | null }>();
  for (const m of membros ?? []) {
    const p = m.pessoas as unknown as { id: string; nome: string; aniversario: string | null; ativo: boolean };
    if (p.ativo) time.set(p.id, { nome: p.nome, aniversario: p.aniversario });
  }

  const { data: carga } = await supabase
    .from("carga_voluntarios")
    .select("pessoa_id, servicos_mes, servicos_90d, ultimo_servico")
    .in("pessoa_id", [...time.keys()]);
  const cargas: Carga[] = [...time.entries()].map(([id, p]) => {
    const c = (carga ?? []).find((x) => x.pessoa_id === id);
    return { pessoaId: id, nome: p.nome, mes: Number(c?.servicos_mes ?? 0), noventa: Number(c?.servicos_90d ?? 0), ultimo: c?.ultimo_servico ?? null };
  });
  cargas.sort((a, b) => b.noventa - a.noventa || a.nome.localeCompare(b.nome, "pt-BR"));
  const niveis = classificarCarga(cargas);

  const mes = Number(mesAtual().slice(5, 7));
  return (
    <TelaTermometro
      linhas={cargas.map((c) => ({ ...c, nivel: niveis.get(c.pessoaId)! }))}
      aniversariantes={aniversariantesDoMes([...time.values()], mes)}
      mes={mes}
    />
  );
}
