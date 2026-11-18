import { describe, expect, it } from "vitest";
import { validarNomeTipo } from "./tipos-evento";

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
