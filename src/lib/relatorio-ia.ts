/** Análise em texto dos números do relatório, escrita pelo Claude. Se falhar, o relatório sai sem ela. */
import type { Relatorio } from "./relatorio-metricas";

const MODELO = "claude-sonnet-5-5";

const INSTRUCOES = `Você analisa os números dos cultos da Igreja Nasci Pra Deus para a liderança. Escreva em português do Brasil, com tom claro, direto e respeitoso, sem jargão.
Regras:
- Use SOMENTE os números recebidos. Não invente causas, eventos nem comparações que não estejam nos dados. Se algo não foi contado, diga que faltou a contagem.
- "Presentes" é o público no local; "online" é a audiência no YouTube; "Sim pra Jesus" são as decisões no apelo.
- Escreva no máximo 170 palavras, em 3 parágrafos curtos, cada um começando com o título em texto simples: "Leitura do dia:", "Tendência:" (últimos 90 dias e meses do ano) e "Atenção:" (um ponto de cuidado ou uma sugestão prática).
- Sem markdown, sem listas, sem emojis, sem asteriscos.`;

/** Deixa só caracteres que o PDF (fonte padrão) consegue desenhar. */
export function limparTextoPdf(s: string): string {
  return s
    .replace(/[*_#`>]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\n -~ -ÿ–—•…]/g, "")
    .trim();
}

export function dadosParaIA(r: Relatorio, titulo: string, dataTexto: string): string {
  const { dia, comparacao: c, dias90: d, ano } = r;
  return JSON.stringify({
    evento: { titulo, data: dataTexto, tipo: dia.tipoNome, contado: dia.contado, cadeiras_da_igreja: r.cadeiras },
    do_dia: { presentes: dia.presentes, ocupacao_pct: dia.ocupacao, online: dia.online, visitantes: dia.visitantes, sim_pra_jesus: dia.sim, voluntarios_contagem_manual: dia.voluntarios, voluntarios_que_apertaram_cheguei: dia.voluntariosAuto, veiculos: dia.veiculos },
    comparacao_com: c.base,
    media_dos_anteriores: c.media,
    variacao_do_dia_contra_a_media_pct: c.variacoes,
    anteriores: c.anteriores.map((a) => ({ titulo: a.titulo, data: a.inicio.slice(0, 10), presentes: a.presentes, online: a.online, visitantes: a.visitantes, sim: a.sim })),
    ultimos_90_dias: { cultos_contados: d.resumo.contados, presentes_media: d.resumo.presentesMedia, online_media: d.resumo.onlineMedia, visitantes_total: d.resumo.visitantesTotal, sim_pra_jesus_total: d.resumo.simPraJesusTotal },
    dias_90_anteriores_a_esses: { cultos_contados: d.anterior.contados, presentes_media: d.anterior.presentesMedia, online_media: d.anterior.onlineMedia, sim_pra_jesus_total: d.anterior.simPraJesusTotal },
    variacao_90_dias_contra_90_anteriores_pct: d.variacoes,
    meses_do_ano: { ano: ano.ano, meses: ano.meses.map((m) => ({ mes: m.nome, cultos: m.cultos, presentes_media: m.presentesMedia, online_media: m.onlineMedia, sim_total: m.simTotal })) },
  });
}

export async function analisar(r: Relatorio, titulo: string, dataTexto: string): Promise<string | null> {
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chave) return null;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 700,
        system: INSTRUCOES,
        messages: [{ role: "user", content: `Dados do relatório (JSON):\n${dadosParaIA(r, titulo, dataTexto)}` }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!resp.ok) return null;
    const j = (await resp.json()) as { content?: { type: string; text?: string }[] };
    const texto = (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
    const limpo = limparTextoPdf(texto);
    return limpo.length > 40 ? limpo : null;
  } catch {
    return null; // nunca derruba o envio por causa da análise
  }
}
