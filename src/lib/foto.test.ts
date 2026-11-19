import { describe, expect, it } from "vitest";
import { MAX_FOTO, validarFoto } from "./foto";

describe("validarFoto", () => {
  it("aceita JPEG pequeno em base64", () => {
    expect(validarFoto("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD=")).toBeNull();
  });
  it("recusa outros tipos, texto estranho e foto gigante", () => {
    expect(validarFoto("data:text/html;base64,AAAA")).toMatch(/JPEG/);
    expect(validarFoto("data:image/jpeg;base64,<script>")).toMatch(/inválida/);
    expect(validarFoto("data:image/jpeg;base64," + "A".repeat(MAX_FOTO))).toMatch(/grande/);
  });
});
