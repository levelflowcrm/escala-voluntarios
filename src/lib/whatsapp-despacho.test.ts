import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Envio completo da fila com um banco falso em memória e a Uazapi simulada (nenhuma mensagem real).
 * Confere: silêncio noturno, ordem de prioridade, reserva (sem envio em dobro), validade e tempo da rodada.
 */
type Linha = Record<string, unknown>;
const banco: Record<string, Linha[]> = { fila_whatsapp: [], pessoas: [] };

function consulta(tabela: string) {
  const filtros: ((l: Linha) => boolean)[] = [];
  const ordens: { col: string; asc: boolean }[] = [];
  let limite = Infinity;
  let patch: Linha | null = null;
  let unica = false;
  const q = {
    select: () => q,
    update: (p: Linha) => ((patch = p), q),
    is: (c: string, v: unknown) => (filtros.push((l) => (l[c] ?? null) === v), q),
    eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), q),
    lt: (c: string, v: string | number) => (filtros.push((l) => (l[c] as string | number) < v), q),
    gte: (c: string, v: string) => (filtros.push((l) => typeof l[c] === "string" && (l[c] as string) >= v), q),
    in: (c: string, v: unknown[]) => (filtros.push((l) => v.includes(l[c])), q),
    not: (c: string) => (filtros.push((l) => l[c] != null), q),
    // só o formato usado no código: "reservado_em.is.null,reservado_em.lt.<data>"
    or: (expr: string) => {
      const [, lt] = expr.split(",");
      const data = lt.replace("reservado_em.lt.", "");
      filtros.push((l) => l.reservado_em == null || (l.reservado_em as string) < data);
      return q;
    },
    order: (col: string, o: { ascending: boolean }) => (ordens.push({ col, asc: o.ascending }), q),
    limit: (n: number) => ((limite = n), q),
    single: () => ((unica = true), q),
    then: (ok: (r: { data: unknown; error: null }) => void) => {
      let linhas = banco[tabela].filter((l) => filtros.every((f) => f(l)));
      if (patch) linhas.forEach((l) => Object.assign(l, patch));
      for (const o of [...ordens].reverse())
        linhas = [...linhas].sort((a, b) => ((a[o.col] as string) < (b[o.col] as string) ? -1 : (a[o.col] as string) > (b[o.col] as string) ? 1 : 0) * (o.asc ? 1 : -1));
      linhas = linhas.slice(0, limite).map((l) => ({ ...l }));
      ok({ data: unica ? (linhas[0] ?? null) : linhas, error: null });
    },
  };
  return q;
}
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: consulta }) }));

const enviadas: { number: string; text: string }[] = [];
const ENV = {
  WHATSAPP_ATIVO: "true",
  NEXT_PUBLIC_SUPABASE_URL: "http://banco-falso",
  SUPABASE_SERVICE_ROLE_KEY: "chave-falsa",
  UAZAPI_URL: "http://uazapi-falsa",
  UAZAPI_TOKEN: "token-falso",
};

function msg(id: string, pessoa: string, prioridade: number, extra: Linha = {}): Linha {
  const agora = Date.now();
  return {
    id,
    pessoa_id: pessoa,
    texto: id,
    prioridade,
    criado_em: new Date(agora - 60_000).toISOString(),
    valido_ate: new Date(agora + 3600_000).toISOString(),
    enviado_em: null,
    reservado_em: null,
    tentativas: 0,
    ...extra,
  };
}

async function rodar(limite: number, orcamentoMs?: number) {
  const { despacharFila } = await import("./whatsapp");
  const p = despacharFila(limite, orcamentoMs);
  await vi.runAllTimersAsync();
  return p;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-21T12:00:00-03:00"));
  Object.assign(process.env, ENV);
  enviadas.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      enviadas.push(JSON.parse(init.body));
      return { ok: true, status: 200 };
    }),
  );
  banco.pessoas = ["a", "b", "c", "d"].map((id, i) => ({ id, celular: `(11) 95402-700${i}` }));
  banco.fila_whatsapp = [];
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("despacharFila", () => {
  it("envia por ordem de prioridade e marca como enviada", async () => {
    banco.fila_whatsapp = [msg("parabens", "a", 4), msg("ocorrencia", "b", 1), msg("lembrete", "c", 3)];
    const r = await rodar(10, 45_000);
    expect(r.enviados).toBe(3);
    expect(enviadas.map((e) => e.text)).toEqual(["ocorrencia", "lembrete", "parabens"]);
    expect(banco.fila_whatsapp.every((l) => l.enviado_em)).toBe(true);
  });

  it("não envia o que outra rotina reservou há pouco (sem mensagem em dobro)", async () => {
    banco.fila_whatsapp = [msg("reservada", "a", 1, { reservado_em: new Date(Date.now() - 60_000).toISOString() }), msg("livre", "b", 2)];
    await rodar(10, 45_000);
    expect(enviadas.map((e) => e.text)).toEqual(["livre"]);
  });

  it("retoma mensagem cuja reserva ficou presa há mais de 5 minutos", async () => {
    banco.fila_whatsapp = [msg("presa", "a", 1, { reservado_em: new Date(Date.now() - 10 * 60_000).toISOString() })];
    await rodar(10, 45_000);
    expect(enviadas.map((e) => e.text)).toEqual(["presa"]);
  });

  it("descarta a vencida sem enviar", async () => {
    banco.fila_whatsapp = [msg("vencida", "a", 1, { valido_ate: new Date(Date.now() - 1000).toISOString() }), msg("ok", "b", 2)];
    await rodar(10, 45_000);
    expect(enviadas.map((e) => e.text)).toEqual(["ok"]);
    expect(banco.fila_whatsapp.find((l) => l.id === "vencida")?.erro).toBe("expirado");
  });

  it("no horário de silêncio não envia nada e mantém a fila", async () => {
    vi.setSystemTime(new Date("2026-11-21T23:00:00-03:00"));
    banco.fila_whatsapp = [msg("noite", "a", 1)];
    const r = await rodar(10, 45_000);
    expect(r).toEqual({ enviados: 0, motivo: "silencio" });
    expect(enviadas).toEqual([]);
    expect(banco.fila_whatsapp[0].enviado_em).toBeNull();
  });

  it("para quando o tempo da rodada acaba; o resto fica para a próxima", async () => {
    banco.fila_whatsapp = ["a", "b", "c", "d"].map((p, i) => msg(`m${i}`, p, 3));
    // 15 s de orçamento: cabe só a primeira (cada envio reserva 8 s + até 3 s de pausa)
    const r = await rodar(10, 15_000);
    expect(r.enviados).toBeLessThan(4);
    expect(r.enviados).toBeGreaterThan(0);
    expect(banco.fila_whatsapp.filter((l) => !l.enviado_em).length).toBe(4 - r.enviados);
  });
});
