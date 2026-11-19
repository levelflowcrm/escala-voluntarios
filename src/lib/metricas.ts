/** Métricas dos cultos: cálculos puros do painel (o banco guarda só o que foi contado). */

export const CADEIRAS_PADRAO = 2055;

export type Ficha = {
  id: string;
  titulo: string;
  inicio: string;
  tipoId: string | null;
  tipoNome: string | null;
  contado: boolean; // existe ficha lançada
  online: number | null;
  visitantes: number | null;
  simPraJesus: number | null;
  naveVazias: number | null;
  galeriaVazias: number | null;
  carros: number | null;
  motos: number | null;
  areas: Record<string, number>; // area_id -> voluntários (contagem manual)
  autoEscalados: number | null;
  autoPresentes: number | null; // quem apertou "Cheguei"
};

/** Presentes = cadeiras - vazias da Nave - vazias da Galeria. Só existe quando os dois setores foram contados. */
export function presentes(f: Pick<Ficha, "naveVazias" | "galeriaVazias">, total = CADEIRAS_PADRAO): number | null {
  if (f.naveVazias == null || f.galeriaVazias == null) return null;
  return Math.max(0, total - f.naveVazias - f.galeriaVazias);
}

export function ocupacao(pres: number | null, total = CADEIRAS_PADRAO): number | null {
  return pres == null ? null : Math.round((pres / total) * 1000) / 10;
}

/** Contagem manual: soma das áreas contadas (null se nenhuma área foi contada). */
export function voluntariosManual(f: Pick<Ficha, "areas">): number | null {
  const v = Object.values(f.areas);
  return v.length === 0 ? null : v.reduce((a, b) => a + b, 0);
}

export function veiculos(f: Pick<Ficha, "carros" | "motos">): number | null {
  return f.carros == null && f.motos == null ? null : (f.carros ?? 0) + (f.motos ?? 0);
}

const valores = (xs: (number | null)[]) => xs.filter((x): x is number => x != null);
const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const media = (xs: number[]) => (xs.length === 0 ? null : Math.round((soma(xs) / xs.length) * 10) / 10);

export type Resumo = {
  eventos: number; // eventos no período
  contados: number; // com ficha lançada
  presentesMedia: number | null;
  presentesMax: { valor: number; titulo: string; inicio: string } | null;
  ocupacaoMedia: number | null;
  onlineMedia: number | null;
  visitantesTotal: number;
  simPraJesusTotal: number;
  voluntariosManualMedia: number | null;
  voluntariosAutoMedia: number | null;
  carrosMedia: number | null;
  motosMedia: number | null;
  /** Voluntários (manual) para cada 100 presentes, nos cultos que têm as duas contagens */
  voluntariosPor100: number | null;
};

export function resumir(fichas: Ficha[], total = CADEIRAS_PADRAO): Resumo {
  const pres = fichas.map((f) => ({ f, p: presentes(f, total) })).filter((x): x is { f: Ficha; p: number } => x.p != null);
  const maior = pres.reduce<{ f: Ficha; p: number } | null>((m, x) => (m == null || x.p > m.p ? x : m), null);
  const ambos = fichas
    .map((f) => ({ p: presentes(f, total), v: voluntariosManual(f) }))
    .filter((x): x is { p: number; v: number } => x.p != null && x.v != null && x.p > 0);
  return {
    eventos: fichas.length,
    contados: fichas.filter((f) => f.contado).length,
    presentesMedia: media(pres.map((x) => x.p)),
    presentesMax: maior ? { valor: maior.p, titulo: maior.f.titulo, inicio: maior.f.inicio } : null,
    ocupacaoMedia: media(pres.map((x) => x.p)) == null ? null : Math.round(((media(pres.map((x) => x.p)) as number) / total) * 1000) / 10,
    onlineMedia: media(valores(fichas.map((f) => f.online))),
    visitantesTotal: soma(valores(fichas.map((f) => f.visitantes))),
    simPraJesusTotal: soma(valores(fichas.map((f) => f.simPraJesus))),
    voluntariosManualMedia: media(valores(fichas.map(voluntariosManual))),
    voluntariosAutoMedia: media(valores(fichas.map((f) => f.autoPresentes)).filter((n) => n > 0)),
    carrosMedia: media(valores(fichas.map((f) => f.carros))),
    motosMedia: media(valores(fichas.map((f) => f.motos))),
    voluntariosPor100: ambos.length === 0 ? null : Math.round((soma(ambos.map((x) => x.v)) / soma(ambos.map((x) => x.p))) * 1000) / 10,
  };
}

/** Variação percentual do atual contra o anterior (null se não dá para comparar). */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null || anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

/** Média de voluntários por área (contagem manual), só nos eventos em que a área foi contada. */
export function mediaPorArea(fichas: Ficha[], areas: { id: string; nome: string }[]): { id: string; nome: string; media: number | null; vezes: number }[] {
  return areas.map((a) => {
    const v = fichas.map((f) => f.areas[a.id]).filter((x): x is number => x != null);
    return { id: a.id, nome: a.nome, media: media(v), vezes: v.length };
  });
}

export type Periodo = 30 | 90 | 180 | 365;
export const PERIODOS: Periodo[] = [30, 90, 180, 365];

export function periodoValido(v: string | undefined): Periodo {
  const n = Number(v);
  return (PERIODOS as number[]).includes(n) ? (n as Periodo) : 90;
}

/** Número com separador de milhar e vírgula decimal ("2.055", "12,5"). */
export function fmtNum(n: number | null, casas = 0): string {
  return n == null ? "–" : n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** Leitura de campo numérico do formulário: vazio = não contado; só inteiros de 0 a 1.000.000. */
export function lerNumero(v: string): { valor: number | null; erro: boolean } {
  const t = v.trim();
  if (t === "") return { valor: null, erro: false };
  if (!/^\d{1,7}$/.test(t)) return { valor: null, erro: true };
  const n = Number(t);
  return n > 1_000_000 ? { valor: null, erro: true } : { valor: n, erro: false };
}
