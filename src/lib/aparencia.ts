export const TEMAS = [
  { id: "auto", nome: "Automático" },
  { id: "claro", nome: "Claro" },
  { id: "escuro", nome: "Escuro" },
] as const;

export const CORES = [
  { id: "roxo", nome: "Roxo", amostra: "#7c3aed" },
  { id: "azul", nome: "Azul", amostra: "#2563eb" },
  { id: "verde", nome: "Verde", amostra: "#059669" },
  { id: "rosa", nome: "Rosa", amostra: "#e11d48" },
  { id: "laranja", nome: "Laranja", amostra: "#ea580c" },
] as const;

export type TemaId = (typeof TEMAS)[number]["id"];
export type CorId = (typeof CORES)[number]["id"];

export const CHAVE_TEMA = "culto360-tema";
export const CHAVE_COR = "culto360-cor";

/** Aplica tema e cor no <html>. Usado pelo script inicial (sem piscar) e pela tela de perfil. */
export function aplicarAparencia(tema: string, cor: string) {
  const escuro = tema === "escuro" || (tema !== "claro" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", escuro);
  document.documentElement.dataset.cor = cor;
}

/** Roda antes da primeira pintura para a tela não "piscar" com a cor errada. */
export const SCRIPT_INICIAL = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}")||"auto",c=localStorage.getItem("${CHAVE_COR}")||"roxo";var d=t==="escuro"||(t!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.dataset.cor=c}catch(e){}})()`;
