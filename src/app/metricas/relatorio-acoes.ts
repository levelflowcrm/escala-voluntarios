"use server";

import { revalidatePath } from "next/cache";
import { fmtDataHora, primeiraMaiuscula } from "@/lib/datas";
import { fmtNum } from "@/lib/metricas";
import { carregarContexto, carregarFichas } from "@/lib/metricas-dados";
import { analisar } from "@/lib/relatorio-ia";
import { enviarDocumento, nomeDoArquivo } from "@/lib/relatorio-envio";
import { montarRelatorio } from "@/lib/relatorio-metricas";
import { gerarPdf, seguro } from "@/lib/relatorio-pdf";
import { criarClienteServidor } from "@/lib/supabase/server";
import { normalizarNumero, whatsappAtivo } from "@/lib/whatsapp";

export type ResultadoRelatorio = { erro: string | null; enviados: number; falhas: number; semAnalise?: boolean };
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Gera o relatório do evento (PDF com análise) e manda por WhatsApp para a lista de destinatários. Só administradores. */
export async function enviarRelatorio(evento: string): Promise<ResultadoRelatorio> {
  const falha = (erro: string): ResultadoRelatorio => ({ erro, enviados: 0, falhas: 0 });
  const supabase = await criarClienteServidor();
  const { data: pode } = await supabase.rpc("pode_ver_metricas");
  if (!pode) return falha("Só administradores enviam o relatório.");
  if (!whatsappAtivo()) return falha("O envio por WhatsApp está desligado no app.");

  const { data: dest } = await supabase.from("metricas_destinatarios").select("nome, celular").order("nome");
  const numeros = (dest ?? []).map((d) => normalizarNumero(d.celular)).filter((n): n is string => !!n);
  if (numeros.length === 0) return falha("Cadastre pelo menos um destinatário com WhatsApp válido.");

  const { data: ev } = await supabase.from("eventos").select("id, titulo, inicio, igreja_id").eq("id", evento).maybeSingle();
  if (!ev) return falha("Evento não encontrado.");
  const inicio = new Date(ev.inicio);
  const ctx = await carregarContexto(supabase);
  const anoEvento = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(inicio));
  const doAno = new Date(Date.UTC(anoEvento, 0, 1, 3));
  const de = new Date(Math.min(doAno.getTime(), inicio.getTime() - 185 * 86_400_000));
  const fichas = await carregarFichas(supabase, de, new Date(inicio.getTime() + 3_600_000));

  const rel = montarRelatorio(fichas, evento, ctx.cadeiras, ctx.areas);
  if (!rel) return falha("Não achei os dados desse evento.");
  if (!rel.dia.contado) return falha("Salve a contagem do culto antes de enviar o relatório.");

  const dataTexto = primeiraMaiuscula(fmtDataHora.format(inicio));
  const analise = await analisar(rel, seguro(ev.titulo), dataTexto);
  const pdf = await gerarPdf(rel, { titulo: ev.titulo, inicio: ev.inicio, dataTexto, geradoEm: new Date(), analise });

  const resumo = [
    rel.dia.presentes != null ? `Presentes: ${fmtNum(rel.dia.presentes)}` : null,
    rel.dia.online != null ? `Online: ${fmtNum(rel.dia.online)}` : null,
    rel.dia.sim != null ? `Sim pra Jesus: ${fmtNum(rel.dia.sim)}` : null,
  ].filter(Boolean).join(" · ");
  const legenda = `📊 Relatório do culto\n${seguro(ev.titulo)} — ${dataTexto}\n${resumo}\nO PDF traz a análise, a comparação com os cultos anteriores e a evolução de 90 dias e dos 12 meses.`;
  const nome = nomeDoArquivo(ev.titulo, inicio);

  let enviados = 0, falhas = 0;
  for (const n of numeros) {
    const r = await enviarDocumento(n, pdf, nome, legenda);
    if (r.ok) enviados++; else falhas++;
    if (numeros.length > 1) await pausa(1500 + Math.floor(Math.random() * 1500)); // intervalo humano entre envios
  }

  if (enviados > 0) {
    const { data: eu } = await supabase.rpc("minha_pessoa");
    await supabase.from("metricas_relatorios").insert({ evento_id: evento, igreja_id: ev.igreja_id, enviado_por: eu ?? null, destinatarios: enviados, falhas });
  }
  revalidatePath(`/metricas/${evento}`);
  if (enviados === 0) return { erro: "Não consegui enviar para ninguém. Confira a conexão do WhatsApp.", enviados, falhas, semAnalise: !analise };
  return { erro: null, enviados, falhas, semAnalise: !analise };
}
