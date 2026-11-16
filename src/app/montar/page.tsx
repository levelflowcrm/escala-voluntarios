import { redirect } from "next/navigation";
import { limitesMes, mesAtual, mesValido } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { type EventoGrade } from "./grade";
import { TelaMontar } from "./tela";

export default async function Montar({ searchParams }: { searchParams: Promise<{ min?: string; mes?: string }> }) {
  const params = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const { data: meus } = await supabase
    .from("membros_ministerio")
    .select("ministerio_id, ministerios!inner(nome)")
    .eq("pessoa_id", eu)
    .eq("papel", "coordenador");
  const ministerios = (meus ?? [])
    .map((m) => ({ id: m.ministerio_id as string, nome: (m.ministerios as unknown as { nome: string }).nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (ministerios.length === 0) redirect("/");

  const ministerio = ministerios.find((m) => m.id === params.min) ?? ministerios[0];
  const mes = mesValido(params.mes) ? params.mes : mesAtual();
  const { inicio, fim } = limitesMes(mes);

  const [{ data: funcoes }, { data: eventos }, { data: membros }] = await Promise.all([
    supabase.from("funcoes").select("id, nome").eq("ministerio_id", ministerio.id).eq("ativo", true).order("ordem"),
    supabase.from("eventos").select("id, titulo, inicio, convocacao_geral, intensivo").gte("inicio", inicio).lt("inicio", fim).order("inicio"),
    supabase
      .from("membros_ministerio")
      .select("pessoa_id, pessoas!inner(nome, ativo)")
      .eq("ministerio_id", ministerio.id),
  ]);
  const eventoIds = (eventos ?? []).map((e) => e.id);
  const funcaoIds = (funcoes ?? []).map((f) => f.id);

  const [{ data: escalas }, { data: situacoes }, { data: habs }] = await Promise.all([
    supabase
      .from("escalas")
      .select("id, evento_id, funcao_id, pessoa_id, papel, status, motivo, pessoas(nome), funcoes(nome)")
      .eq("ministerio_id", ministerio.id)
      .in("evento_id", eventoIds),
    supabase.from("escalas_ministerio").select("evento_id, publicada").eq("ministerio_id", ministerio.id).in("evento_id", eventoIds),
    supabase.from("habilitacoes").select("pessoa_id, funcao_id").eq("nivel", "apto").in("funcao_id", funcaoIds),
  ]);

  const nomes = new Map(
    (membros ?? [])
      .filter((m) => (m.pessoas as unknown as { ativo: boolean }).ativo)
      .map((m) => [m.pessoa_id as string, (m.pessoas as unknown as { nome: string }).nome]),
  );
  const aptos: Record<string, { id: string; nome: string }[]> = {};
  for (const f of funcoes ?? []) {
    aptos[f.id] = (habs ?? [])
      .filter((h) => h.funcao_id === f.id && nomes.has(h.pessoa_id))
      .map((h) => ({ id: h.pessoa_id, nome: nomes.get(h.pessoa_id)! }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
  const publicada = new Map((situacoes ?? []).map((s) => [s.evento_id, s.publicada as boolean]));

  type LinhaEscala = {
    id: string;
    evento_id: string;
    funcao_id: string | null;
    pessoa_id: string;
    papel: string;
    status: string;
    motivo: string | null;
    pessoas: { nome: string } | null;
    funcoes: { nome: string } | null;
  };
  const lista = (escalas ?? []) as unknown as LinhaEscala[];
  const agora = Date.now();

  const grade: EventoGrade[] = (eventos ?? []).map((e) => {
    const doEvento = lista.filter((x) => x.evento_id === e.id);
    const ativos = doEvento.filter((x) => x.status === "pendente" || x.status === "confirmado");
    const responsavel = ativos.find((x) => x.papel === "responsavel_dia");
    return {
      id: e.id,
      titulo: e.titulo,
      inicio: e.inicio,
      passado: new Date(e.inicio).getTime() < agora,
      reuniao: e.convocacao_geral,
      situacao: !publicada.has(e.id) ? "vazio" : publicada.get(e.id) ? "publicada" : "rascunho",
      responsavel: responsavel ? { nome: responsavel.pessoas?.nome ?? "", status: responsavel.status } : null,
      vagas: (funcoes ?? []).map((f) => {
        const t = ativos.find((x) => x.funcao_id === f.id && x.papel === "titular");
        return {
          funcaoId: f.id,
          funcao: f.nome,
          pessoaId: t?.pessoa_id ?? null,
          status: t?.status ?? null,
          recusas: doEvento
            .filter((x) => x.funcao_id === f.id && x.status === "recusado")
            .map((x) => ({ nome: x.pessoas?.nome ?? "", motivo: x.motivo })),
        };
      }),
      extras: ativos
        .filter((x) => x.papel === "apoio" || x.papel === "treinamento")
        .map((x) => ({ nome: x.pessoas?.nome ?? "", papel: x.papel, funcao: x.funcoes?.nome ?? "" })),
    };
  });

  return (
    <TelaMontar
      ministerios={ministerios}
      ministerio={ministerio}
      mes={mes}
      temFuncoes={funcaoIds.length > 0}
      grade={grade}
      aptos={aptos}
    />
  );
}
