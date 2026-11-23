import { describe, expect, it } from "vitest";
import { montarMensagemNotificacao, montarMensagemPush, pushConfigurado, TIPOS_PUSH } from "./push";

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

describe("montarMensagemNotificacao", () => {
  it("monta o push dos avisos de novo ministério e de escala em outro ministério", () => {
    expect(montarMensagemNotificacao("novo_ministerio", "Ana, do seu time, também foi adicionado(a) ao ministério Projeção.", "/comunicados", "n1")).toEqual({
      titulo: "Novo ministério no time",
      corpo: "Ana, do seu time, também foi adicionado(a) ao ministério Projeção.",
      url: "/comunicados",
      tag: "novo_ministerio:n1",
    });
    expect(montarMensagemNotificacao("escalado_outro_ministerio", "Ana foi escalado(a).", "/montar", "n2")?.titulo).toBe("Escala em outro ministério");
    expect(montarMensagemNotificacao("novo_ministerio_voluntario", "Você agora também faz parte do ministério Projeção.", "/", "n3")?.titulo).toBe("Novo ministério");
  });

  it("ignora tipos sem push e destinos que não são do próprio app", () => {
    expect(montarMensagemNotificacao("outro_tipo", "x", "/", "1")).toBeNull();
    expect(montarMensagemNotificacao("novo_ministerio", "x", "https://golpe.example", "1")?.url).toBe("/");
  });
});
