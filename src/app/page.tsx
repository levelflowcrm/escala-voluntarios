import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { calcularPendencias, type EscalaPend } from "@/lib/pendencias";
import { proximosAniversarios } from "@/lib/aniversarios";
import { diaNoFuso, limitesMes, mesAtual } from "@/lib/datas";
import { TelaInicio, type Linha } from "./tela-inicio";

const CAMPOS = "id, papel, status, motivo, chegou_em, eventos!inner(titulo, inicio, cor), funcoes(nome), ministerios(nome)";

export default async function Inicio() {
  const supabase = await criarClienteServidor();
  const { data: pessoaId } = await supabase.rpc("vincular_conta");
  if (!pessoaId) redirect("/sem-cadastro");

  const agora = new Date().toISOString();
  const quinzeDias = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: pessoa }, { data: coordenador }, { data: admin }, { data: futuras }, { data: passadas }, { data: avisos }, { data: leitura }] = await Promise.all([
    supabase.from("pessoas").select("nome").eq("id", pessoaId).single(),
    supabase.rpc("sou_coordenador_algum"),
    supabase.rpc("sou_admin"),
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
    supabase
      .from("comunicados")
      .select("id, titulo, texto, ministerios!inner(nome)")
      .gte("criado_em", quinzeDias)
      .order("criado_em", { ascending: false })
      .limit(2),
    supabase.from("leituras_comunicados").select("visto_em").eq("pessoa_id", pessoaId).maybeSingle(),
  ]);

  // Sininho: comunicados de outras pessoas criados depois da última visita à tela de comunicados.
  const desde = leitura?.visto_em ?? quinzeDias;
  const { count: novos } = await supabase
    .from("comunicados")
    .select("id", { count: "exact", head: true })
    .gt("criado_em", desde)
    .or(`autor_id.is.null,autor_id.neq.${pessoaId}`);
  // Coordenador: quem avisou "Cheguei" depois da última visita também acende o sino.
  let chegadasNovas = 0;
  if (coordenador) {
    const { data: ch } = await supabase.rpc("chegadas_do_dia");
    chegadasNovas = ((ch ?? []) as { pessoa_id: string; chegou_em: string | null }[]).filter(
      (c) => c.chegou_em && c.chegou_em > desde && c.pessoa_id !== pessoaId,
    ).length;
  }

  // Administrador master: erros e sugestões do app que ainda não foram vistos.
  let mensagensNovas = 0;
  if (admin) {
    const { data: master } = await supabase.rpc("sou_admin_master");
    if (master) {
      const { count } = await supabase.from("mensagens_app").select("id", { count: "exact", head: true }).eq("status", "nova");
      mensagensNovas = count ?? 0;
    }
  }

  // Quantas vezes servi neste mês (confirmadas, já realizadas ou não).
  const { inicio: iniMes, fim: fimMes } = limitesMes(mesAtual());
  const { data: doMes } = await supabase
    .from("escalas")
    .select("id, eventos!inner(inicio)")
    .eq("pessoa_id", pessoaId)
    .eq("status", "confirmado")
    .gte("eventos.inicio", iniMes)
    .lt("eventos.inicio", fimMes);
  const [{ data: vagas }, { data: trocas }] = await Promise.all([supabase.rpc("vagas_abertas"), supabase.rpc("minhas_trocas")]);
  const vagasParaMim = (vagas ?? []).length;
  const { data: pts } = await supabase.rpc("minha_pontuacao");
  const minhaPontuacao = ((pts ?? []) as { pontos: number; nivel: string }[])[0] ?? null;
  const { data: avaliar } = await supabase.rpc("maisfeliz_pendentes");
  const maisFeliz = ((avaliar ?? []) as { evento_id: string; titulo: string }[])[0] ?? null;
  const trocasRecebidas = ((trocas ?? []) as { direcao: string }[]).filter((t) => t.direcao === "recebida").length;

  const servidasNoMes = doMes?.length ?? 0;

  // Coordenador: o que precisa de atenção (a RLS só devolve o que ele enxerga).
  let pendencias = null;
  if (coordenador) {
    const limite = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const [{ data: esc }, { data: sit }] = await Promise.all([
      supabase
        .from("escalas")
        .select("id, evento_id, funcao_id, papel, status, motivo, pessoas(nome), funcoes(nome), eventos!inner(titulo, inicio)")
        .gte("eventos.inicio", agora)
        .lt("eventos.inicio", limite)
        .in("status", ["pendente", "confirmado", "recusado"]),
      supabase.from("escalas_ministerio").select("evento_id").eq("publicada", true),
    ]);
    const lista: EscalaPend[] = (esc ?? []).map((e) => {
      const ev = e.eventos as unknown as { titulo: string; inicio: string };
      return {
        id: e.id,
        eventoId: e.evento_id,
        funcaoId: e.funcao_id,
        papel: e.papel,
        status: e.status,
        motivo: e.motivo,
        pessoa: (e.pessoas as unknown as { nome: string } | null)?.nome ?? "",
        funcao: (e.funcoes as unknown as { nome: string } | null)?.nome ?? "",
        evento: ev.titulo,
        inicio: ev.inicio,
      };
    });
    pendencias = calcularPendencias(lista, new Set((sit ?? []).map((x) => x.evento_id)), new Date());
  }

  // A ordenação por tabela relacionada não ordena as linhas principais; ordena aqui.
  const porData = (lista: Linha[], sentido: 1 | -1) =>
    lista.sort((a, b) => sentido * (+new Date(a.eventos.inicio) - +new Date(b.eventos.inicio)));
  const proximas = porData((futuras ?? []) as unknown as Linha[], 1);
  const historico = porData((passadas ?? []) as unknown as Linha[], -1);

  // Surpresa de aniversário (aparece a partir das 9h, no próprio aparelho)
  const hojeSp = diaNoFuso(new Date());
  const [{ data: meus }, { data: fotoLinha }] = await Promise.all([
    supabase.rpc("meus_dados").maybeSingle<{ nome: string; aniversario: string | null }>(),
    supabase.from("fotos_perfil").select("foto").eq("pessoa_id", pessoaId).maybeSingle(),
  ]);
  const aniversarioHoje = meus ? proximosAniversarios([{ nome: meus.nome, aniversario: meus.aniversario }], hojeSp, 0)[0]?.faltam === 0 : false;

  return (
    <TelaInicio
      nome={pessoa?.nome ?? ""}
      coordenador={!!coordenador}
      parabens={aniversarioHoje ? { nome: (pessoa?.nome ?? "").split(" ")[0], dia: hojeSp, foto: fotoLinha?.foto ?? null } : null}
      admin={!!admin}
      proximas={proximas}
      historico={historico}
      novosComunicados={(novos ?? 0) + chegadasNovas}
      mensagensNovas={mensagensNovas}
      servidasNoMes={servidasNoMes}
      vagasParaMim={vagasParaMim}
      trocasRecebidas={trocasRecebidas}
      pontuacao={minhaPontuacao}
      maisFeliz={maisFeliz ? { eventoId: maisFeliz.evento_id, titulo: maisFeliz.titulo } : null}
      pendencias={pendencias}
      avisos={(avisos ?? []).map((a) => ({
        id: a.id,
        titulo: a.titulo,
        texto: a.texto,
        ministerio: (a.ministerios as unknown as { nome: string }).nome,
      }))}
    />
  );
}
