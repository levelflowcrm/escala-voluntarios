/** Desenha o relatório do culto em PDF (A4, fontes padrão, gráficos feitos com formas simples). */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { FUSO } from "./datas";
import { fmtNum } from "./metricas";
import type { LinhaCulto, Relatorio } from "./relatorio-metricas";

const L = 595, A = 842, M = 40; // largura, altura, margem
const AZUL = rgb(0.145, 0.388, 0.922), AZUL_CLARO = rgb(0.91, 0.94, 0.99), TEXTO = rgb(0.1, 0.12, 0.16);
const CINZA = rgb(0.42, 0.45, 0.5), LINHA = rgb(0.86, 0.88, 0.91), VERDE = rgb(0.05, 0.55, 0.35), VERMELHO = rgb(0.75, 0.15, 0.2);
const OUTRO = rgb(0.58, 0.64, 0.74);

const dm = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });
const dma = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "2-digit" });

/** Só caracteres que a fonte padrão desenha (tira emojis e símbolos raros). */
export function seguro(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^ -~ -ÿ–—•…]/g, "").replace(/\s+/g, " ").trim();
}

export function fmtVar(v: number | null): string {
  if (v == null) return "–";
  return `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

type Ctx = { doc: PDFDocument; reg: PDFFont; neg: PDFFont; paginas: PDFPage[] };

function quebrar(texto: string, fonte: PDFFont, tam: number, larg: number): string[] {
  const saida: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(" ")) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tam) > larg && atual) { saida.push(atual); atual = palavra; } else atual = tentativa;
    }
    saida.push(atual);
  }
  return saida;
}

function texto(c: Ctx, p: PDFPage, t: string, x: number, y: number, o: { tam?: number; neg?: boolean; cor?: ReturnType<typeof rgb>; alinhar?: "e" | "c" | "d"; larg?: number } = {}) {
  const tam = o.tam ?? 10, fonte = o.neg ? c.neg : c.reg, s = seguro(t);
  const w = fonte.widthOfTextAtSize(s, tam);
  const xx = o.alinhar === "d" ? x - w : o.alinhar === "c" ? x - w / 2 : x;
  p.drawText(s, { x: xx, y, size: tam, font: fonte, color: o.cor ?? TEXTO });
}

function cabecalho(c: Ctx, p: PDFPage, titulo: string, sub: string) {
  p.drawRectangle({ x: 0, y: A - 78, width: L, height: 78, color: AZUL });
  texto(c, p, "Mais Conectados  ·  Relatório do culto", M, A - 28, { tam: 10, cor: rgb(0.85, 0.91, 1) });
  const t = seguro(titulo);
  let tam = 20;
  while (tam > 12 && c.neg.widthOfTextAtSize(t, tam) > L - 2 * M) tam--;
  texto(c, p, t, M, A - 52, { tam, neg: true, cor: rgb(1, 1, 1) });
  texto(c, p, sub, M, A - 69, { tam: 10, cor: rgb(0.85, 0.91, 1) });
}

function secao(c: Ctx, p: PDFPage, t: string, y: number): number {
  texto(c, p, t, M, y, { tam: 13, neg: true });
  p.drawLine({ start: { x: M, y: y - 5 }, end: { x: L - M, y: y - 5 }, thickness: 1, color: LINHA });
  return y - 22;
}

function cartao(c: Ctx, p: PDFPage, x: number, y: number, w: number, rotulo: string, valor: string, nota?: string, notaCor = CINZA) {
  p.drawRectangle({ x, y: y - 58, width: w, height: 58, color: AZUL_CLARO });
  texto(c, p, rotulo.toUpperCase(), x + 8, y - 15, { tam: 7, cor: CINZA, neg: true });
  texto(c, p, valor, x + 8, y - 40, { tam: 20, neg: true });
  if (nota) texto(c, p, nota, x + 8, y - 52, { tam: 7.5, cor: notaCor });
}

function corVar(v: number | null) { return v == null ? CINZA : v >= 0 ? VERDE : VERMELHO; }

type Barra = { rotulo: string; valor: number | null; destaque?: boolean };
function barras(c: Ctx, p: PDFPage, x: number, y: number, w: number, h: number, titulo: string, itens: Barra[], cor = AZUL, casas = 0) {
  texto(c, p, titulo, x, y, { tam: 9, neg: true, cor: CINZA });
  const topo = y - 10, base = y - h + 14, alto = topo - base - 10;
  const max = Math.max(1, ...itens.map((i) => i.valor ?? 0));
  for (let g = 0; g <= 3; g++) {
    const yy = base + (alto * g) / 3;
    p.drawLine({ start: { x, y: yy }, end: { x: x + w, y: yy }, thickness: 0.4, color: LINHA });
  }
  const passo = w / itens.length, larg = Math.min(passo * 0.62, 34);
  itens.forEach((it, i) => {
    const cx = x + passo * i + passo / 2;
    if (it.valor == null) texto(c, p, "–", cx, base + 3, { tam: 8, cor: CINZA, alinhar: "c" });
    else {
      const bh = Math.max(1, (it.valor / max) * alto);
      p.drawRectangle({ x: cx - larg / 2, y: base, width: larg, height: bh, color: it.destaque ? AZUL : cor === AZUL ? OUTRO : cor });
      texto(c, p, fmtNum(it.valor, casas), cx, base + bh + 3, { tam: itens.length > 8 ? 6.5 : 7.5, alinhar: "c", neg: it.destaque });
    }
    texto(c, p, it.rotulo, cx, base - 10, { tam: itens.length > 8 ? 6.5 : 7.5, alinhar: "c", cor: CINZA });
  });
}

function tabela(c: Ctx, p: PDFPage, y: number, colunas: { t: string; w: number; d?: boolean }[], linhas: { cels: string[]; neg?: boolean; fundo?: boolean }[]): number {
  let x = M;
  const xs = colunas.map((col) => { const r = x; x += col.w; return r; });
  p.drawRectangle({ x: M, y: y - 4, width: x - M, height: 16, color: AZUL });
  colunas.forEach((col, i) => texto(c, p, col.t, col.d ? xs[i] + col.w - 4 : xs[i] + 4, y, { tam: 7.5, neg: true, cor: rgb(1, 1, 1), alinhar: col.d ? "d" : "e" }));
  y -= 18;
  for (const l of linhas) {
    if (l.fundo) p.drawRectangle({ x: M, y: y - 4, width: x - M, height: 15, color: AZUL_CLARO });
    l.cels.forEach((cel, i) => {
      let s = seguro(cel);
      const max = colunas[i].w - 8;
      while (s.length > 1 && c.reg.widthOfTextAtSize(s, 8.5) > max) s = s.slice(0, -2) + "…";
      texto(c, p, s, colunas[i].d ? xs[i] + colunas[i].w - 4 : xs[i] + 4, y, { tam: 8.5, neg: l.neg, alinhar: colunas[i].d ? "d" : "e" });
    });
    p.drawLine({ start: { x: M, y: y - 5 }, end: { x, y: y - 5 }, thickness: 0.4, color: LINHA });
    y -= 15;
  }
  return y - 6;
}

const cel = (n: number | null, casas = 0) => fmtNum(n, casas);
const dataCurta = (iso: string) => dm.format(new Date(iso));

export async function gerarPdf(r: Relatorio, meta: { titulo: string; inicio: string; dataTexto: string; geradoEm: Date; analise: string | null }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Relatório do culto - ${seguro(meta.titulo)}`);
  doc.setProducer("Mais Conectados");
  const c: Ctx = { doc, reg: await doc.embedFont(StandardFonts.Helvetica), neg: await doc.embedFont(StandardFonts.HelveticaBold), paginas: [] };
  const nova = () => { const p = doc.addPage([L, A]); c.paginas.push(p); return p; };

  // ---------- Página 1: dados do dia + análise ----------
  let p = nova();
  cabecalho(c, p, meta.titulo, meta.dataTexto);
  const { dia, comparacao: cmp } = r;
  let y = A - 108;
  y = secao(c, p, "Dados do dia", y);
  const w4 = (L - 2 * M - 3 * 8) / 4;
  const v = cmp.variacoes;
  const nota = (x: number | null) => (x == null ? undefined : `${fmtVar(x)} vs. média`);
  const cartoes: [string, string, string | undefined, number | null][] = [
    ["Presentes", cel(dia.presentes), nota(v.presentes), v.presentes],
    ["Ocupação", dia.ocupacao == null ? "–" : `${cel(dia.ocupacao, 1)}%`, `de ${cel(r.cadeiras)} cadeiras`, null],
    ["Online", cel(dia.online), nota(v.online), v.online],
    ["Visitantes", cel(dia.visitantes), nota(v.visitantes), v.visitantes],
    ["Sim pra Jesus", cel(dia.sim), nota(v.sim), v.sim],
    ["Voluntários (contagem)", cel(dia.voluntarios), nota(v.voluntarios), v.voluntarios],
    ["Voluntários (Cheguei)", cel(dia.voluntariosAuto), undefined, null],
    ["Veículos", cel(dia.veiculos), undefined, null],
  ];
  cartoes.forEach(([rot, val, nt, vr], i) => cartao(c, p, M + (i % 4) * (w4 + 8), y - Math.floor(i / 4) * 66, w4, rot, val, nt, corVar(vr)));
  y -= 2 * 66 + 22;
  if (!dia.contado) { texto(c, p, "Atenção: este culto ainda não tem contagem lançada.", M, y, { tam: 9, cor: VERMELHO }); y -= 16; }

  y = secao(c, p, "Análise", y);
  const corpo = meta.analise ?? "A análise automática não ficou disponível neste envio. Os números abaixo seguem completos.";
  for (const linha of quebrar(corpo, c.reg, 10, L - 2 * M)) {
    if (y < 140) break;
    texto(c, p, linha, M, y, { tam: 10, cor: meta.analise ? TEXTO : CINZA });
    y -= 14;
  }
  y -= 8;
  if (dia.areas.length > 0 && y > 190) {
    y = secao(c, p, "Voluntários por área (contagem do dia)", y);
    barras(c, p, M, y, L - 2 * M, 120, "", dia.areas.map((a) => ({ rotulo: a.nome, valor: a.qtd, destaque: true })));
  }

  // ---------- Página 2: comparação ----------
  p = nova();
  cabecalho(c, p, meta.titulo, "Comparação com cultos e eventos anteriores");
  y = A - 108;
  y = secao(c, p, `Comparação — ${cmp.base}`, y);
  if (cmp.anteriores.length === 0) {
    texto(c, p, "Ainda não há cultos anteriores com contagem para comparar.", M, y, { tam: 10, cor: CINZA });
  } else {
    const cols = [{ t: "Data", w: 44 }, { t: "Evento", w: 175 }, { t: "Presentes", w: 62, d: true }, { t: "Online", w: 55, d: true }, { t: "Visit.", w: 50, d: true }, { t: "Sim", w: 45, d: true }, { t: "Vol.", w: 44, d: true }];
    const lin = (l: LinhaCulto, neg = false, fundo = false) => ({ cels: [dataCurta(l.inicio), l.titulo, cel(l.presentes), cel(l.online), cel(l.visitantes), cel(l.sim), cel(l.voluntarios)], neg, fundo });
    const m = cmp.media;
    y = tabela(c, p, y, cols, [
      lin(dia, true, true),
      ...cmp.anteriores.map((l) => lin(l)),
      { cels: ["", "Média dos anteriores", cel(m.presentes), cel(m.online), cel(m.visitantes), cel(m.sim), cel(m.voluntarios)], neg: true, fundo: true },
      { cels: ["", "Dia vs. média", fmtVar(v.presentes), fmtVar(v.online), fmtVar(v.visitantes), fmtVar(v.sim), fmtVar(v.voluntarios)], neg: true },
    ]);
    y -= 14;
    const ordem = [...cmp.anteriores].reverse();
    barras(c, p, M, y, L - 2 * M, 150, "Presentes — do mais antigo ao culto de hoje (azul)", [...ordem.map((l) => ({ rotulo: dataCurta(l.inicio), valor: l.presentes })), { rotulo: dataCurta(dia.inicio), valor: dia.presentes, destaque: true }]);
    y -= 170;
    barras(c, p, M, y, L - 2 * M, 150, "Online — do mais antigo ao culto de hoje (azul)", [...ordem.map((l) => ({ rotulo: dataCurta(l.inicio), valor: l.online })), { rotulo: dataCurta(dia.inicio), valor: dia.online, destaque: true }]);
  }

  // ---------- Página 3: 90 dias ----------
  p = nova();
  cabecalho(c, p, meta.titulo, "Evolução dos últimos 90 dias");
  y = A - 108;
  y = secao(c, p, "Últimos 90 dias contra os 90 dias anteriores", y);
  const d = r.dias90;
  [
    ["Cultos contados", cel(d.resumo.contados), `antes: ${cel(d.anterior.contados)}`, null],
    ["Presentes (média)", cel(d.resumo.presentesMedia, 1), `${fmtVar(d.variacoes.presentesMedia)} vs. 90 dias antes`, d.variacoes.presentesMedia],
    ["Online (média)", cel(d.resumo.onlineMedia, 1), `${fmtVar(d.variacoes.onlineMedia)} vs. 90 dias antes`, d.variacoes.onlineMedia],
    ["Sim pra Jesus (total)", cel(d.resumo.simPraJesusTotal), `${fmtVar(d.variacoes.simPraJesusTotal)} vs. 90 dias antes`, d.variacoes.simPraJesusTotal],
  ].forEach(([rot, val, nt, vr], i) => cartao(c, p, M + i * (w4 + 8), y, w4, rot as string, val as string, nt as string, corVar(vr as number | null)));
  y -= 90;
  barras(c, p, M, y, L - 2 * M, 190, "Presentes — média por semana (13 semanas até o culto de hoje)", d.semanas.map((s) => ({ rotulo: s.rotulo, valor: s.presentes })), AZUL, 0);
  y -= 215;
  barras(c, p, M, y, L - 2 * M, 190, "Online — média por semana", d.semanas.map((s) => ({ rotulo: s.rotulo, valor: s.online })), AZUL, 0);
  y -= 215;
  texto(c, p, "Semanas sem culto contado aparecem com traço (–). As barras mostram a média dos cultos contados na semana.", M, y, { tam: 8, cor: CINZA });

  // ---------- Página 4: 12 meses ----------
  p = nova();
  cabecalho(c, p, meta.titulo, `Evolução dos 12 meses de ${r.ano.ano}`);
  y = A - 108;
  y = secao(c, p, `Mês a mês — ${r.ano.ano}`, y);
  barras(c, p, M, y, L - 2 * M, 170, "Presentes — média por culto contado, em cada mês (mês do culto em azul)", r.ano.meses.map((m, i) => ({ rotulo: m.nome, valor: m.presentesMedia, destaque: i === r.ano.mesDoEvento })), AZUL, 0);
  y -= 195;
  barras(c, p, M, y, L - 2 * M, 170, "Online — média por culto contado, em cada mês (mês do culto em azul)", r.ano.meses.map((m, i) => ({ rotulo: m.nome, valor: m.onlineMedia, destaque: i === r.ano.mesDoEvento })), AZUL, 0);
  y -= 195;
  barras(c, p, M, y, L - 2 * M, 150, "Sim pra Jesus — total de cada mês (mês do culto em azul)", r.ano.meses.map((m, i) => ({ rotulo: m.nome, valor: m.simTotal, destaque: i === r.ano.mesDoEvento })), AZUL, 0);
  y -= 170;
  texto(c, p, `Cultos contados por mês: ${r.ano.meses.map((m) => `${m.nome} ${m.cultos}`).join(" · ")}`, M, y, { tam: 8, cor: CINZA });

  // ---------- rodapé ----------
  const gerado = `${dma.format(meta.geradoEm)} ${new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(meta.geradoEm)}`;
  c.paginas.forEach((pg, i) => {
    texto(c, pg, `Mais Conectados  ·  gerado em ${gerado}  ·  contagens lançadas pela administração`, M, 22, { tam: 7.5, cor: CINZA });
    texto(c, pg, `${i + 1}/${c.paginas.length}`, L - M, 22, { tam: 7.5, cor: CINZA, alinhar: "d" });
  });
  return doc.save();
}
