import { describe, expect, it } from "vitest";
import { emojiDaMedia, TERMOMETRO } from "./maisfeliz";

describe("emojiDaMedia", () => {
  it("arredonda para a nota mais próxima", () => {
    expect(emojiDaMedia(4.0)).toBe("🙂");
    expect(emojiDaMedia(4.5)).toBe("😍");
    expect(emojiDaMedia(2.4)).toBe("😕");
  });
  it("não sai da escala", () => {
    expect(emojiDaMedia(0)).toBe(TERMOMETRO[0].emoji);
    expect(emojiDaMedia(9)).toBe(TERMOMETRO[4].emoji);
  });
});
