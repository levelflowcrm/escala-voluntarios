import { describe, expect, it } from "vitest";
import { filtrarMusicas, linkValido, validarMusica, type DadosMusica } from "./musicas";

const base: DadosMusica = { titulo: "Grande é o Senhor", artista: "", tom: "", link_letra: "", link_cifra: "", link_video: "", link_audio: "", observacao: "" };

describe("validarMusica", () => {
  it("aceita só o título", () => expect(validarMusica(base)).toBeNull());
  it("exige título", () => expect(validarMusica({ ...base, titulo: " " })).toMatch(/título/));
  it("confere o tom", () => {
    expect(validarMusica({ ...base, tom: "Bb" })).toBeNull();
    expect(validarMusica({ ...base, tom: "F#m" })).toBeNull();
    expect(validarMusica({ ...base, tom: "H" })).toMatch(/Tom inválido/);
  });
  it("só aceita links http(s)", () => {
    expect(validarMusica({ ...base, link_video: "https://youtu.be/abc" })).toBeNull();
    expect(validarMusica({ ...base, link_letra: "javascript:alert(1)" })).toMatch(/letra/);
    expect(linkValido("youtube.com/x")).toBe(false);
  });
});

describe("filtrarMusicas", () => {
  const l = [{ titulo: "Ressuscita-me", artista: "Aline Barros" }, { titulo: "Grande é o Senhor", artista: null }];
  it("ignora acento e maiúscula", () => {
    expect(filtrarMusicas(l, "RESSUSCITA")).toHaveLength(1);
    expect(filtrarMusicas(l, "senhor")).toHaveLength(1);
    expect(filtrarMusicas(l, "barros")).toHaveLength(1);
  });
  it("busca vazia devolve tudo", () => expect(filtrarMusicas(l, " ")).toHaveLength(2));
});
