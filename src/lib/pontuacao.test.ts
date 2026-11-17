import { describe, expect, it } from "vitest";
import { dadosDoNivel, progressoNivel } from "./pontuacao";

describe("progressoNivel", () => {
  it("mostra quanto falta para o próximo nível", () => {
    expect(progressoNivel(0)).toMatchObject({ faltam: 30, percentual: 0 });
    expect(progressoNivel(20).proximo?.id).toBe("plantinha");
    expect(progressoNivel(15).percentual).toBe(50);
    expect(progressoNivel(30).proximo?.id).toBe("arbusto");
    expect(progressoNivel(119).proximo?.id).toBe("arvore")
    expect(progressoNivel(179).proximo?.id).toBe("frutifera");
  });
  it("na árvore frutífera não há próximo nível", () => {
    expect(progressoNivel(240)).toEqual({ proximo: null, faltam: 0, percentual: 100 });
  });
});

describe("dadosDoNivel", () => {
  it("cai em semente para nível desconhecido", () => {
    expect(dadosDoNivel("xpto").id).toBe("semente");
    expect(dadosDoNivel("frutifera").emoji).toBe("🌳🍎");
  });
});
