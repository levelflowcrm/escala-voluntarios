"use server";

import { revalidatePath } from "next/cache";
import { TIPOS } from "@/lib/agenda-tipos";
import { diaNoFuso, inicioNoFuso } from "@/lib/datas";
import { gerarOcorrencias, type Repeticao, REPETICOES } from "@/lib/recorrencia";
import { criarClienteServidor } from "@/lib/supabase/server";

type R = { erro: string | null };
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export type DadosEvento = {
  titulo: string;
  tipo: string;
  dia: string;
  hora: string;
  diaFim: string;
  horaFim: string;
  local: string;
  descricao: string;
  repeticao?: Repeticao;
  ate?: string;
};

export type Alcance = "este" | "proximos";

function validar(d: DadosEvento) {
  const titulo = d.titulo.trim();
  if (!titulo) return { erro: "Dê um nome ao evento" } as const;
  if (titulo.length > 120) return { erro: "Nome muito longo (máximo 120 letras)" } as const;
  if (!TIPOS[d.tipo]) return { erro: "Escolha o tipo do evento" } as const;
  if (!DATA.test(d.dia) || !HORA.test(d.hora)) return { erro: "Informe data e hora de início" } as const;
  const inicio = inicioNoFuso(d.dia, d.hora);
  let fim: string | null = null;
  if (d.horaFim || d.diaFim) {
    const diaFim = d.diaFim || d.dia;
    if (!DATA.test(diaFim) || !HORA.test(d.horaFim || "")) return { erro: "Informe o fim completo (data e hora) ou deixe em branco" } as const;
    fim = inicioNoFuso(diaFim, d.horaFim);
    if (new Date(fim) <= new Date(inicio)) return { erro: "O fim precisa ser depois do início" } as const;
  }
  const local = d.local.trim().slice(0, 120) || null;
  const observacao = d.descricao.trim().slice(0, 1000) || null;
  return { erro: null, ok: { titulo, tipo_agenda: d.tipo, inicio, fim, local, observacao } } as const;
}

/** Cria evento de agenda (com repetição opcional). Só administrador (a RLS barra os demais). */
export async function criarEventoAgenda(d: DadosEvento): Promise<R> {
  const v = validar(d);
  if (v.erro !== null) return { erro: v.erro };
  const repeticao = d.repeticao ?? "nenhuma";
  if (!REPETICOES[repeticao]) return { erro: "Repetição inválida" };
  if (repeticao !== "nenhuma" && !DATA.test(d.ate ?? "")) return { erro: "Informe até quando o evento se repete" };

  const supabase = await criarClienteServidor();
  const { data: admin } = await supabase.rpc("sou_admin");
  if (!admin) return { erro: "Só o administrador da igreja pode cadastrar eventos na agenda." };
  const { data: igrejaId } = await supabase.rpc("minha_igreja");

  const dias = gerarOcorrencias(d.dia, repeticao, d.ate ?? d.dia);
  const duracao = v.ok.fim ? new Date(v.ok.fim).getTime() - new Date(v.ok.inicio).getTime() : null;
  const serie = dias.length > 1 ? crypto.randomUUID() : null;
  const linhas = dias.map((dia) => {
    const inicio = inicioNoFuso(dia, d.hora);
    return {
      igreja_id: igrejaId,
      so_agenda: true,
      serie_id: serie,
      ...v.ok,
      inicio,
      fim: duracao === null ? null : new Date(new Date(inicio).getTime() + duracao).toISOString(),
    };
  });
  const { error } = await supabase.from("eventos").insert(linhas);
  revalidatePath("/agenda");
  revalidatePath("/");
  return { erro: error ? "Não foi possível salvar o evento agora." : null };
}

/** Edita um evento; com alcance "proximos", este e os seguintes da série (mantém o dia de cada um). */
export async function editarEventoAgenda(id: string, d: DadosEvento, alcance: Alcance = "este"): Promise<R> {
  const v = validar(d);
  if (v.erro !== null) return { erro: v.erro };
  const supabase = await criarClienteServidor();
  const { data: atual } = await supabase.from("eventos").select("id, serie_id, inicio").eq("id", id).eq("so_agenda", true).maybeSingle();
  if (!atual) return { erro: "Evento não encontrado ou sem permissão." };

  let erro = null;
  if (alcance === "proximos" && atual.serie_id) {
    const { data: lote } = await supabase
      .from("eventos")
      .select("id, inicio")
      .eq("serie_id", atual.serie_id)
      .eq("so_agenda", true)
      .gte("inicio", atual.inicio);
    const duracao = v.ok.fim ? new Date(v.ok.fim).getTime() - new Date(v.ok.inicio).getTime() : null;
    for (const e of lote ?? []) {
      const inicio = e.id === id ? v.ok.inicio : inicioNoFuso(diaNoFuso(new Date(e.inicio)), d.hora);
      const fim = duracao === null ? null : new Date(new Date(inicio).getTime() + duracao).toISOString();
      const r = await supabase.from("eventos").update({ ...v.ok, inicio, fim }).eq("id", e.id);
      if (r.error) erro = r.error;
    }
  } else {
    const r = await supabase.from("eventos").update(v.ok).eq("id", id).eq("so_agenda", true);
    erro = r.error;
  }
  revalidatePath("/agenda");
  return { erro: erro ? "Não foi possível salvar tudo agora." : null };
}

export async function apagarEventoAgenda(id: string, alcance: Alcance = "este"): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data: atual } = await supabase.from("eventos").select("id, serie_id, inicio").eq("id", id).eq("so_agenda", true).maybeSingle();
  if (!atual) return { erro: "Evento não encontrado ou sem permissão." };
  const consulta = supabase.from("eventos").delete().eq("so_agenda", true);
  const { error } =
    alcance === "proximos" && atual.serie_id
      ? await consulta.eq("serie_id", atual.serie_id).gte("inicio", atual.inicio)
      : await consulta.eq("id", id);
  revalidatePath("/agenda");
  return { erro: error ? "Não foi possível apagar agora." : null };
}
