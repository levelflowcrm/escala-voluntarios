import type { criarClienteServidor } from "@/lib/supabase/server";
import { CADEIRAS_PADRAO, type Ficha } from "./metricas";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

type LinhaEvento = { id: string; titulo: string; inicio: string; tipo_evento_id: string | null; tipos_evento: { nome: string } | null };
type LinhaFicha = {
  evento_id: string; online: number | null; visitantes: number | null; sim_pra_jesus: number | null;
  cadeiras_nave_vazias: number | null; cadeiras_galeria_vazias: number | null; carros: number | null; motos: number | null;
};

export type Contexto = {
  areas: { id: string; nome: string }[];
  cadeiras: number;
  tipos: { id: string; nome: string }[];
};

/** Áreas de contagem, capacidade e tipos de evento da igreja. */
export async function carregarContexto(supabase: Cliente): Promise<Contexto> {
  const [{ data: areas }, { data: cfg }, { data: tipos }] = await Promise.all([
    supabase.from("areas_contagem").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("metricas_config").select("cadeiras_total").maybeSingle(),
    supabase.from("tipos_evento").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  return { areas: areas ?? [], cadeiras: cfg?.cadeiras_total ?? CADEIRAS_PADRAO, tipos: tipos ?? [] };
}

/** Todas as linhas de uma consulta, em páginas (o servidor entrega no máximo 1000 por vez). */
async function paginar<T>(pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await pagina(de, de + 999);
    todas.push(...(data ?? []));
    if (!data || data.length < 1000) return todas;
  }
}

/** Eventos já iniciados entre `de` e `ate`, com o que foi contado em cada um. */
export async function carregarFichas(supabase: Cliente, de: Date, ate: Date, tipo?: string): Promise<Ficha[]> {
  const eventos = await paginar<LinhaEvento>((a, b) => {
    let q = supabase.from("eventos").select("id, titulo, inicio, tipo_evento_id, tipos_evento(nome)").gte("inicio", de.toISOString()).lt("inicio", ate.toISOString());
    if (tipo) q = q.eq("tipo_evento_id", tipo);
    return q.order("inicio").range(a, b) as unknown as PromiseLike<{ data: LinhaEvento[] | null }>;
  });
  if (eventos.length === 0) return [];
  const ids = new Set(eventos.map((e) => e.id));
  const [fichas, areas, auto] = await Promise.all([
    paginar<LinhaFicha>((a, b) => supabase.from("metricas_evento").select("evento_id, online, visitantes, sim_pra_jesus, cadeiras_nave_vazias, cadeiras_galeria_vazias, carros, motos").order("evento_id").range(a, b) as unknown as PromiseLike<{ data: LinhaFicha[] | null }>),
    paginar<{ evento_id: string; area_id: string; qtd: number }>((a, b) => supabase.from("metricas_areas").select("evento_id, area_id, qtd").order("evento_id").range(a, b) as unknown as PromiseLike<{ data: { evento_id: string; area_id: string; qtd: number }[] | null }>),
    supabase.rpc("metricas_auto", { p_de: de.toISOString(), p_ate: ate.toISOString() }),
  ]);
  const porEvento = new Map(fichas.filter((f) => ids.has(f.evento_id)).map((f) => [f.evento_id, f]));
  const areasPorEvento = new Map<string, Record<string, number>>();
  for (const a of areas) {
    if (!ids.has(a.evento_id)) continue;
    const m = areasPorEvento.get(a.evento_id) ?? {};
    m[a.area_id] = a.qtd;
    areasPorEvento.set(a.evento_id, m);
  }
  const autoPorEvento = new Map(((auto.data ?? []) as { evento_id: string; escalados: number; presentes: number }[]).map((x) => [x.evento_id, x]));
  return eventos.map((e) => {
    const f = porEvento.get(e.id);
    const au = autoPorEvento.get(e.id);
    return {
      id: e.id, titulo: e.titulo, inicio: e.inicio, tipoId: e.tipo_evento_id, tipoNome: e.tipos_evento?.nome ?? null,
      contado: !!f,
      online: f?.online ?? null, visitantes: f?.visitantes ?? null, simPraJesus: f?.sim_pra_jesus ?? null,
      naveVazias: f?.cadeiras_nave_vazias ?? null, galeriaVazias: f?.cadeiras_galeria_vazias ?? null,
      carros: f?.carros ?? null, motos: f?.motos ?? null,
      areas: areasPorEvento.get(e.id) ?? {},
      autoEscalados: au?.escalados ?? null, autoPresentes: au?.presentes ?? null,
    };
  });
}
