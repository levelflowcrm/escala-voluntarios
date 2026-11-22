import { describe, expect, it } from "vitest";
import { montarMensagemPush, pushConfigurado, TIPOS_PUSH } from "./push";

describe("montarMensagemPush", () => {
  it("monta título, destino e tag para os avisos do nível 1", () => {
    const m = montarMensagemPush("vaga_aberta", "Vaga aberta: *Câmera* no culto de domingo", "abc");
    expect(m).toEqual({ titulo: "Vaga aberta", corpo: "Vaga aberta: Câmera no culto de domingo", url: "/vagas", tag: "vaga_aberta:abc" });
  });

  it("tira links, negrito e quebras de linha do texto do WhatsApp", () => {
    const m = montarMensagemPush("ocorrencia", "Nova ocorrência\n\n*Som* falhou\nVeja em https://maisconectados.com.br/ocorrencias", "1");
    expect(m?.corpo).toBe("Nova ocorrência Som falhou Veja em");
    expect(m?.url).toBe("/ocorrencias");
  });

  it("corta textos longos com reticências", () => {
    const m = montarMensagemPush("publicada", "a".repeat(500), "1");
    expect(m!.corpo.length).toBeLessThanOrEqual(180);
    expect(m!.corpo.endsWith("…")).toBe(true);
  });

  it("ignora tipos fora do nível 1", () => {
    for (const t of ["aniversario", "boas_vindas", "maisfeliz", "repertorio", "mensagem_app"]) {
      expect(montarMensagemPush(t, "texto", "1")).toBeNull();
    }
  });

  it("cobre exatamente os seis avisos do nível 1", () => {
    expect([...TIPOS_PUSH].sort()).toEqual(["chegada", "lembrete", "ocorrencia", "publicada", "troca", "vaga_aberta"]);
  });
});

describe("pushConfigurado", () => {
  it("só liga com as três variáveis", () => {
    expect(pushConfigurado({})).toBe(false);
    expect(pushConfigurado({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "a", VAPID_PRIVATE_KEY: "b" })).toBe(false);
    expect(pushConfigurado({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "a", VAPID_PRIVATE_KEY: "b", VAPID_SUBJECT: "mailto:x@y.com" })).toBe(true);
  });
});
