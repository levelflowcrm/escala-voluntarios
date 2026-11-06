/**
 * Motor de sugestão de escala.
 *
 * Para cada vaga (evento × função), escolhe o voluntário mais adequado:
 *
 * Regras obrigatórias (quem não cumpre nem entra na lista):
 *   - estar habilitado como "apto" na função;
 *   - não ter indisponibilidade naquele dia/turno (inclusive "1º domingo");
 *   - não estar bloqueado no período (viagem etc.);
 *   - não estar já escalado no mesmo evento (em qualquer ministério);
 *   - não passar do limite de serviços no mês (se definido).
 *
 * Critérios de prioridade (rodízio justo):
 *   - menos serviços no mês;
 *   - evita servir duas vezes no mesmo dia (exceto em evento intensivo);
 *   - evita quem serviu nos últimos dias;
 *   - menos serviços nos últimos 90 dias;
 *   - quem está há mais tempo sem servir.
 *
 * Funções com menos candidatos são preenchidas primeiro, para não "gastar"
 * uma pessoa rara numa função que outros também cobririam.
 */

export type Periodo = "manha" | "tarde" | "noite";

export interface EventoEntrada {
  id: string;
  inicio: string | Date;
  intensivo?: boolean;
}

export interface FuncaoEntrada {
  id: string;
  nome: string;
}

export interface Indisponibilidade {
  diaSemana: number; // 0 = domingo
  periodo?: Periodo | null; // nulo = dia inteiro
  ordemNoMes?: number | null; // nulo = toda semana
}

export interface Bloqueio {
  inicio: string; // AAAA-MM-DD
  fim: string;
}

export interface VoluntarioEntrada {
  id: string;
  nome: string;
  funcoesAptas: string[];
  indisponibilidades?: Indisponibilidade[];
  bloqueios?: Bloqueio[];
  /** Datas/horas de serviços já realizados ou já escalados fora desta sugestão */
  historico?: (string | Date)[];
}

export interface EscalaExistente {
  eventoId: string;
  pessoaId: string;
  funcaoId?: string | null;
}

export interface OpcoesSugestao {
  limitePorMes?: number;
  fuso?: string;
  /** Data de referência para "últimos 90 dias" (padrão: agora) */
  hoje?: Date;
}

export interface Atribuicao {
  eventoId: string;
  funcaoId: string;
  pessoaId: string;
  alertas: string[];
}

export interface ResultadoSugestao {
  atribuicoes: Atribuicao[];
  vagasSemCandidato: { eventoId: string; funcaoId: string }[];
}

interface InfoData {
  dia: string; // AAAA-MM-DD no fuso da igreja
  diaSemana: number;
  periodo: Periodo;
  ordemNoMes: number;
  mes: string; // AAAA-MM
  ms: number;
}

const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DIA_MS = 86_400_000;

export function infoData(d: string | Date, fuso = "America/Sao_Paulo"): InfoData {
  const data = typeof d === "string" ? new Date(d) : d;
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(data)
      .map((p) => [p.type, p.value]),
  );
  const hora = Number(partes.hour);
  const diaMes = Number(partes.day);
  return {
    dia: `${partes.year}-${partes.month}-${partes.day}`,
    diaSemana: DIAS[partes.weekday],
    periodo: hora < 12 ? "manha" : hora < 18 ? "tarde" : "noite",
    ordemNoMes: Math.ceil(diaMes / 7),
    mes: `${partes.year}-${partes.month}`,
    ms: data.getTime(),
  };
}

function indisponivel(v: VoluntarioEntrada, d: InfoData): boolean {
  return (v.indisponibilidades ?? []).some(
    (i) =>
      i.diaSemana === d.diaSemana &&
      (i.periodo == null || i.periodo === d.periodo) &&
      (i.ordemNoMes == null || i.ordemNoMes === d.ordemNoMes),
  );
}

function bloqueado(v: VoluntarioEntrada, d: InfoData): boolean {
  return (v.bloqueios ?? []).some((b) => b.inicio <= d.dia && d.dia <= b.fim);
}

export function sugerirEscala(
  eventos: EventoEntrada[],
  funcoes: FuncaoEntrada[],
  voluntarios: VoluntarioEntrada[],
  existentes: EscalaExistente[] = [],
  opcoes: OpcoesSugestao = {},
): ResultadoSugestao {
  const fuso = opcoes.fuso ?? "America/Sao_Paulo";
  const hoje = (opcoes.hoje ?? new Date()).getTime();

  // Serviços de cada pessoa (histórico + o que for sendo atribuído)
  const servicos = new Map<string, InfoData[]>();
  for (const v of voluntarios) {
    servicos.set(v.id, (v.historico ?? []).map((h) => infoData(h, fuso)));
  }

  const infoEvento = new Map(eventos.map((e) => [e.id, infoData(e.inicio, fuso)]));
  const pessoasNoEvento = new Map<string, Set<string>>();
  const vagasOcupadas = new Set<string>();
  for (const e of existentes) {
    if (!pessoasNoEvento.has(e.eventoId)) pessoasNoEvento.set(e.eventoId, new Set());
    pessoasNoEvento.get(e.eventoId)!.add(e.pessoaId);
    if (e.funcaoId) vagasOcupadas.add(`${e.eventoId}|${e.funcaoId}`);
    const info = infoEvento.get(e.eventoId);
    if (info) servicos.get(e.pessoaId)?.push(info);
  }

  const resultado: ResultadoSugestao = { atribuicoes: [], vagasSemCandidato: [] };
  const ordenados = [...eventos].sort((a, b) => infoEvento.get(a.id)!.ms - infoEvento.get(b.id)!.ms);

  for (const evento of ordenados) {
    const d = infoEvento.get(evento.id)!;
    const noEvento = pessoasNoEvento.get(evento.id) ?? new Set<string>();
    pessoasNoEvento.set(evento.id, noEvento);

    const elegiveis = (funcaoId: string) =>
      voluntarios.filter((v) => {
        if (!v.funcoesAptas.includes(funcaoId)) return false;
        if (noEvento.has(v.id)) return false;
        if (indisponivel(v, d) || bloqueado(v, d)) return false;
        const noMes = servicos.get(v.id)!.filter((s) => s.mes === d.mes).length;
        if (opcoes.limitePorMes != null && noMes >= opcoes.limitePorMes) return false;
        return true;
      });

    const abertas = funcoes
      .filter((f) => !vagasOcupadas.has(`${evento.id}|${f.id}`))
      .map((f) => ({ f, candidatos: elegiveis(f.id).length }))
      .sort((a, b) => a.candidatos - b.candidatos);

    for (const { f } of abertas) {
      const candidatos = elegiveis(f.id);
      if (candidatos.length === 0) {
        resultado.vagasSemCandidato.push({ eventoId: evento.id, funcaoId: f.id });
        continue;
      }

      const pontuados = candidatos.map((v) => {
        const lista = servicos.get(v.id)!;
        const noMes = lista.filter((s) => s.mes === d.mes).length;
        const mesmoDia = lista.some((s) => s.dia === d.dia);
        const dist = lista
          .map((s) => Math.abs(s.ms - d.ms) / DIA_MS)
          .reduce((min, x) => Math.min(min, x), Infinity);
        const ult90 = lista.filter((s) => s.ms <= hoje && s.ms > hoje - 90 * DIA_MS).length;
        const ultimo = lista.reduce((max, s) => (s.ms < d.ms ? Math.max(max, s.ms) : max), 0);

        let pontos = noMes * 100 + ult90 * 5;
        if (mesmoDia && !evento.intensivo) pontos += 1000;
        if (dist < 7) pontos += Math.round((7 - dist) * 20);

        const alertas: string[] = [];
        if (mesmoDia && !evento.intensivo) alertas.push("Já serve em outro evento neste dia");
        if (dist < 3) alertas.push("Serviu há menos de 3 dias");
        return { v, pontos, ultimo, alertas };
      });

      pontuados.sort(
        (a, b) => a.pontos - b.pontos || a.ultimo - b.ultimo || a.v.nome.localeCompare(b.v.nome, "pt-BR"),
      );
      const escolhido = pontuados[0];
      resultado.atribuicoes.push({
        eventoId: evento.id,
        funcaoId: f.id,
        pessoaId: escolhido.v.id,
        alertas: escolhido.alertas,
      });
      noEvento.add(escolhido.v.id);
      vagasOcupadas.add(`${evento.id}|${f.id}`);
      servicos.get(escolhido.v.id)!.push(d);
    }
  }

  return resultado;
}
