import { describe, expect, it } from "vitest";
import { dadosDoNivel, progressoNivel } from "./pontuacao";

describe("progressoNivel", () => {
  it("mostra quanto falta para o próximo nível", () => {
    expect(progressoNivel(0)).toMatchObject({ faltam: 40, percentual: 0 });
    expect(progressoNivel(20).proximo?.id).toBe("bronze");
    expect(progressoNivel(20).percentual).toBe(50);
    expect(progressoNivel(40).proximo?.id).toBe("prata");
  });
  it("no ouro não há próximo nível", () => {
    expect(progressoNivel(300)).toEqual({ proximo: null, faltam: 0, percentual: 100 });
  });
});

describe("dadosDoNivel", () => {
  it("cai em semente para nível desconhecido", () => {
    expect(dadosDoNivel("xpto").id).toBe("semente");
    expect(dadosDoNivel("ouro").emoji).toBe("🥇");
  });
});
