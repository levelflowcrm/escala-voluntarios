import { describe, expect, it } from "vitest";
import {
  emSilencio,
  escolherEnviaveis,
  MAX_POR_PESSOA_DIA,
  MAX_TOTAL_DIA,
  normalizarNumero,
  pausaAleatoria,
  VALIDADE_HORAS,
  whatsappAtivo,
  type ItemFila,
} from "./whatsapp";

describe("normalizarNumero", () => {
  it("formata celulares brasileiros", () => {
    expect(normalizarNumero("(11) 95402-4089")).toBe("5511954024089");
    expect(normalizarNumero("11954024089")).toBe("5511954024089");
    expect(normalizarNumero("+55 11 95402-4089")).toBe("5511954024089");
    expect(normalizarNumero("011 95402-4089")).toBe("5511954024089");
  });
  it("rejeita o que não parece telefone", () => {
    expect(normalizarNumero("")).toBeNull();
    expect(normalizarNumero(null)).toBeNull();
    expect(normalizarNumero("12345")).toBeNull();
    expect(normalizarNumero("+1 415 555 2671")).toBeNull();
    expect(normalizarNumero("1133334444")).toBeNull(); // fixo não recebe WhatsApp
  });
});

describe("interruptor", () => {
  it("só liga com WHATSAPP_ATIVO=true", () => {
    expect(whatsappAtivo({ WHATSAPP_ATIVO: "true" })).toBe(true);
    expect(whatsappAtivo({ WHATSAPP_ATIVO: "1" })).toBe(false);
    expect(whatsappAtivo({ WHATSAPP_ATIVO: "false" })).toBe(false);
    expect(whatsappAtivo({})).toBe(false);
  });
});

describe("escolherEnviaveis", () => {
  const agora = new Date("2026-11-17T12:00:00Z");
  const item = (id: string, pessoa: string, horasAtras = 1, celular: string | null = "11954024089"): ItemFila => ({
    id,
    pessoa_id: pessoa,
    texto: "oi",
    criado_em: new Date(agora.getTime() - horasAtras * 3600_000).toISOString(),
    celular,
  });

  it("respeita o limite da rodada", () => {
    const itens = ["a", "b", "c", "d"].map((p, i) => item(`i${i}`, p));
    expect(escolherEnviaveis(itens, {}, agora, 2).enviar.map((i) => i.id)).toEqual(["i0", "i1"]);
  });

  it("descarta mensagens vencidas e as marca como expiradas", () => {
    const r = escolherEnviaveis([item("velha", "a", VALIDADE_HORAS + 1), item("nova", "b")], {}, agora, 10);
    expect(r.expirados).toEqual(["velha"]);
    expect(r.enviar.map((i) => i.id)).toEqual(["nova"]);
  });

  it("limita por pessoa por dia, contando o que já foi enviado", () => {
    const itens = [item("1", "a"), item("2", "a"), item("3", "a")];
    const r = escolherEnviaveis(itens, { a: MAX_POR_PESSOA_DIA - 1 }, agora, 10);
    expect(r.enviar.map((i) => i.id)).toEqual(["1"]);
  });

  it("pula quem não tem celular válido", () => {
    const r = escolherEnviaveis([item("1", "a", 1, null), item("2", "b", 1, "123")], {}, agora, 10);
    expect(r.enviar).toEqual([]);
  });
});

describe("validade, teto diário e silêncio", () => {
  const agora = new Date("2026-11-21T15:00:00Z"); // 12h em São Paulo
  const item = (id: string, pessoa: string, extra: Partial<ItemFila> = {}): ItemFila => ({
    id,
    pessoa_id: pessoa,
    texto: "oi",
    criado_em: new Date(agora.getTime() - 3600_000).toISOString(),
    celular: "11954024089",
    ...extra,
  });

  it("usa a validade própria da mensagem quando existe", () => {
    const r = escolherEnviaveis(
      [
        item("vencida", "a", { valido_ate: new Date(agora.getTime() - 60_000).toISOString() }),
        // criada há 20h, mas ainda válida (ex.: boas-vindas valem 72h)
        item("antiga-valida", "b", { criado_em: new Date(agora.getTime() - 20 * 3600_000).toISOString(), valido_ate: new Date(agora.getTime() + 3600_000).toISOString() }),
      ],
      {},
      agora,
      10,
    );
    expect(r.expirados).toEqual(["vencida"]);
    expect(r.enviar.map((i) => i.id)).toEqual(["antiga-valida"]);
  });

  it("respeita o teto total do dia somando todo mundo", () => {
    const itens = ["a", "b", "c"].map((p, i) => item(`i${i}`, p));
    expect(escolherEnviaveis(itens, {}, agora, 10, MAX_TOTAL_DIA - 2).enviar.map((i) => i.id)).toEqual(["i0", "i1"]);
    expect(escolherEnviaveis(itens, {}, agora, 10, MAX_TOTAL_DIA).enviar).toEqual([]);
  });

  it("mantém a ordem de prioridade em que a fila chega", () => {
    const itens = [item("urgente", "a"), item("lembrete", "b"), item("parabens", "c")];
    expect(escolherEnviaveis(itens, {}, agora, 2).enviar.map((i) => i.id)).toEqual(["urgente", "lembrete"]);
  });

  it("silêncio das 22h às 7h no horário de São Paulo", () => {
    expect(emSilencio(new Date("2026-11-21T21:59:00-03:00"))).toBe(false);
    expect(emSilencio(new Date("2026-11-21T22:00:00-03:00"))).toBe(true);
    expect(emSilencio(new Date("2026-11-22T03:00:00-03:00"))).toBe(true);
    expect(emSilencio(new Date("2026-11-22T06:59:00-03:00"))).toBe(true);
    expect(emSilencio(new Date("2026-11-22T07:00:00-03:00"))).toBe(false);
  });

  it("pausa entre mensagens varia de 1 a 3 segundos", () => {
    expect(pausaAleatoria(0)).toBe(1000);
    expect(pausaAleatoria(1)).toBe(3000);
    expect(pausaAleatoria(0.5)).toBe(2000);
  });
});
