/** Dados do relatório do culto (cálculos puros; quem busca no banco e quem desenha o PDF ficam de fora). */
import { FUSO } from "./datas";
import { mediaPorArea, ocupacao, presentes, resumir, variacao, veiculos, voluntariosManual, type Ficha, type Resumo } from "./metricas";

const DIA = 86_400_000;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type LinhaCulto = {
  titulo: string;
  inicio: string;
  presentes: number | null;
  ocupacao: number | null;
  online: number | null;
  visitantes: number | null;
  sim: number | null;
  voluntarios: number | null;
  veiculos: number | null;
};

export type Relatorio = {
  cadeiras: number;
  dia: LinhaCulto & { tipoNome: string | null; contado: boolean; voluntariosAuto: number | null; areas: { nome: string; qtd: number }[] };
  comparacao: {
    base: string;
    anteriores: LinhaCulto[]; // do mais recente para o mais antigo
    media: { presentes: number | null; online: number | null; visitantes: number | null; sim: number | null; voluntarios: number | null };
    variacoes: { presentes: number | null; online: number | null; visitantes: number | null; sim: number | null; voluntarios: number | null };
  };
  dias90: {
    resumo: Resumo;
    anterior: Resumo;
    variacoes: { presentesMedia: number | null; onlineMedia: number | null; simPraJesusTotal: number | null };
    semanas: { rotulo: string; presentes: number | null; online: number | null }[]; // da mais antiga para a mais recente
  };
  ano: {
    ano: number;
    mesDoEvento: number; // 0 = janeiro
    meses: { nome: string; cultos: number; presentesMedia: number | null; onlineMedia: number | null; simTotal: number | null; visitantesTotal: number | null }[];
  };
};

const arred = (n: number) => Math.round(n * 10) / 10;
function mediaDe(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x != null);
  return v.length === 0 ? null : arred(v.reduce((a, b) => a + b, 0) / v.length);
}

function partes(iso: string): { ano: number; mes: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit" }).formatToParts(new Date(iso));
  return { ano: Number(p.find((x) => x.type === "year")!.value), mes: Number(p.find((x) => x.type === "month")!.value) };
}

const dm = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });

export function linha(f: Ficha, cadeiras: number): LinhaCulto {
  const p = presentes(f, cadeiras);
  return {
    titulo: f.titulo, inicio: f.inicio, presentes: p, ocupacao: ocupacao(p, cadeiras), online: f.online,
    visitantes: f.visitantes, sim: f.simPraJesus, voluntarios: voluntariosManual(f), veiculos: veiculos(f),
  };
}

/**
 * Monta o relatório do evento `eventoId`. `fichas` deve cobrir ao menos 180 dias antes do evento e o ano inteiro dele
 * (todos os tipos de evento). Devolve null se o evento não estiver na lista.
 */
export function montarRelatorio(fichas: Ficha[], eventoId: string, cadeiras: number, areas: { id: string; nome: string }[]): Relatorio | null {
  const atual = fichas.find((f) => f.id === eventoId);
  if (!atual) return null;
  const t0 = new Date(atual.inicio).getTime();

  // Comparação: cultos anteriores do mesmo tipo (se houver pelo menos 3); senão, todos os eventos contados.
  const anterioresTodos = fichas.filter((f) => f.contado && new Date(f.inicio).getTime() < t0).sort((a, b) => b.inicio.localeCompare(a.inicio));
  const mesmoTipo = atual.tipoId ? anterioresTodos.filter((f) => f.tipoId === atual.tipoId) : [];
  const usaTipo = mesmoTipo.length >= 3;
  const base = (usaTipo ? mesmoTipo : anterioresTodos).slice(0, 6);
  const linhas = base.map((f) => linha(f, cadeiras));
  const dia = linha(atual, cadeiras);
  const media = {
    presentes: mediaDe(linhas.map((l) => l.presentes)), online: mediaDe(linhas.map((l) => l.online)),
    visitantes: mediaDe(linhas.map((l) => l.visitantes)), sim: mediaDe(linhas.map((l) => l.sim)),
    voluntarios: mediaDe(linhas.map((l) => l.voluntarios)),
  };

  // Últimos 90 dias (até o evento, inclusive) e os 90 anteriores a eles.
  const dentro = (de: number, ate: number) => fichas.filter((f) => { const t = new Date(f.inicio).getTime(); return t > de && t <= ate; });
  const f90 = dentro(t0 - 90 * DIA, t0);
  const fAnt90 = dentro(t0 - 180 * DIA, t0 - 90 * DIA);
  const r90 = resumir(f90, cadeiras);
  const rAnt = resumir(fAnt90, cadeiras);

  // 13 semanas terminando no evento
  const semanas: Relatorio["dias90"]["semanas"] = [];
  for (let i = 12; i >= 0; i--) {
    const fim = t0 - i * 7 * DIA, ini = fim - 7 * DIA;
    const doGrupo = fichas.filter((f) => { const t = new Date(f.inicio).getTime(); return t > ini && t <= fim && f.contado; });
    semanas.push({ rotulo: dm.format(new Date(ini + DIA)), presentes: mediaDe(doGrupo.map((f) => presentes(f, cadeiras))), online: mediaDe(doGrupo.map((f) => f.online)) });
  }

  // 12 meses do ano do evento
  const { ano, mes: mesEvento } = partes(atual.inicio);
  const meses = MESES.map((nome, i) => {
    const doMes = fichas.filter((f) => { const p = partes(f.inicio); return p.ano === ano && p.mes === i + 1; });
    const r = resumir(doMes, cadeiras);
    return { nome, cultos: r.contados, presentesMedia: r.presentesMedia, onlineMedia: r.onlineMedia, simTotal: r.simPraJesusTotal, visitantesTotal: r.visitantesTotal };
  });

  const porArea = mediaPorArea([atual], areas);
  return {
    cadeiras,
    dia: {
      ...dia, tipoNome: atual.tipoNome, contado: atual.contado, voluntariosAuto: atual.autoPresentes,
      areas: porArea.filter((a) => a.media != null).map((a) => ({ nome: a.nome, qtd: a.media as number })),
    },
    comparacao: {
      base: usaTipo ? `cultos anteriores do mesmo tipo (${atual.tipoNome ?? "evento"})` : "eventos anteriores",
      anteriores: linhas, media,
      variacoes: {
        presentes: variacao(dia.presentes, media.presentes), online: variacao(dia.online, media.online),
        visitantes: variacao(dia.visitantes, media.visitantes), sim: variacao(dia.sim, media.sim), voluntarios: variacao(dia.voluntarios, media.voluntarios),
      },
    },
    dias90: {
      resumo: r90, anterior: rAnt,
      variacoes: {
        presentesMedia: variacao(r90.presentesMedia, rAnt.presentesMedia), onlineMedia: variacao(r90.onlineMedia, rAnt.onlineMedia),
        simPraJesusTotal: variacao(r90.simPraJesusTotal, rAnt.simPraJesusTotal),
      },
      semanas,
    },
    ano: { ano, mesDoEvento: mesEvento - 1, meses },
  };
}
