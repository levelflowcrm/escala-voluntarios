export type MusicaBiblioteca = {
  id: string;
  titulo: string;
  artista: string | null;
  tom: string | null;
  link_letra: string | null;
  link_cifra: string | null;
  link_video: string | null;
  link_audio: string | null;
  observacao: string | null;
};

export type DadosMusica = {
  titulo: string;
  artista: string;
  tom: string;
  link_letra: string;
  link_cifra: string;
  link_video: string;
  link_audio: string;
  observacao: string;
};

export const TONS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
export const TOM_VALIDO = /^[A-G][#b]?m?$/;
export const LINKS = [
  { campo: "link_letra", rotulo: "Letra", icone: "📄" },
  { campo: "link_cifra", rotulo: "Cifra", icone: "🎸" },
  { campo: "link_video", rotulo: "Vídeo", icone: "▶️" },
  { campo: "link_audio", rotulo: "Áudio", icone: "🎧" },
] as const;

export function linkValido(l: string): boolean {
  const t = l.trim();
  if (t.length > 500 || !/^https?:\/\//i.test(t)) return false;
  try {
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

/** Confere os campos da música. Devolve a mensagem de erro ou null (o banco confere de novo). */
export function validarMusica(d: DadosMusica): string | null {
  if (!d.titulo.trim()) return "Escreva o título da música.";
  if (d.titulo.trim().length > 120 || d.artista.trim().length > 120) return "Título ou artista muito longo (máximo 120 letras).";
  if (d.tom.trim() && !TOM_VALIDO.test(d.tom.trim())) return "Tom inválido. Use, por exemplo: G, Bb, F#m.";
  for (const l of LINKS) {
    const v = d[l.campo].trim();
    if (v && !linkValido(v)) return `O link de ${l.rotulo.toLowerCase()} precisa começar com http:// ou https://.`;
  }
  if (d.observacao.trim().length > 500) return "Observação muito longa (máximo 500 letras).";
  return null;
}

/** Busca sem acento e sem diferença de maiúsculas, no título e no artista. */
export function filtrarMusicas<T extends { titulo: string; artista: string | null }>(lista: T[], busca: string): T[] {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const q = norm(busca.trim());
  if (!q) return lista;
  return lista.filter((m) => norm(`${m.titulo} ${m.artista ?? ""}`).includes(q));
}
