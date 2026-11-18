import { describe, expect, it } from "vitest";
import { emOrdemAlfabetica, validarNomeTipo } from "./tipos-evento";

describe("validarNomeTipo", () => {
  it("limpa espaços repetidos e das pontas", () => {
    expect(validarNomeTipo("  Noite   de Unção ")).toEqual({ nome: "Noite de Unção", erro: null });
  });
  it("recusa nome vazio ou curto demais", () => {
    expect(validarNomeTipo("   ").erro).toBeTruthy();
    expect(validarNomeTipo("a").erro).toBeTruthy();
  });
  it("recusa nome com mais de 60 letras", () => {
    expect(validarNomeTipo("x".repeat(61)).erro).toBeTruthy();
    expect(validarNomeTipo("x".repeat(60)).erro).toBeNull();
  });
});

describe("emOrdemAlfabetica", () => {
  it("ordena sem diferenciar maiúsculas nem acentos", () => {
    const nomes = ["TREINAMENTO", "Summit", "Ação social", "batismo", "Vigília", "Outro", "Conferência WeGo"].map((nome) => ({ nome }));
    expect(emOrdemAlfabetica(nomes).map((x) => x.nome)).toEqual(["Ação social", "batismo", "Conferência WeGo", "Outro", "Summit", "TREINAMENTO", "Vigília"]);
  });
  it("não altera a lista original", () => {
    const l = [{ nome: "b" }, { nome: "a" }];
    emOrdemAlfabetica(l);
    expect(l[0].nome).toBe("b");
  });
});
