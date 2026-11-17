import { describe, expect, it } from "vitest";
import { escolherEnviaveis, MAX_POR_PESSOA_DIA, normalizarNumero, VALIDADE_HORAS, whatsappAtivo, type ItemFila } from "./whatsapp";

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
