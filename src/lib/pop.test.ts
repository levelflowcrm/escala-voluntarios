import { describe, expect, it } from "vitest";
import { validarLinkPop } from "./pop";

describe("validarLinkPop", () => {
  it("vazio vira null sem erro", () => {
    expect(validarLinkPop("  ")).toEqual({ link: null, erro: null });
  });
  it("aceita https e http", () => {
    expect(validarLinkPop("https://drive.google.com/file/d/1").erro).toBeNull();
    expect(validarLinkPop(" http://exemplo.com ").link).toBe("http://exemplo.com/");
  });
  it("recusa outros protocolos e texto solto", () => {
    expect(validarLinkPop("javascript:alert(1)").erro).not.toBeNull();
    expect(validarLinkPop("drive.google.com/x").erro).not.toBeNull();
  });
  it("recusa link enorme", () => {
    expect(validarLinkPop("https://a.com/" + "x".repeat(500)).erro).toBe("Link muito longo");
  });
});
