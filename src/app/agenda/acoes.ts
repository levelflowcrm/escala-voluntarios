"use server";

import { revalidatePath } from "next/cache";
import { TIPOS } from "@/lib/agenda-tipos";
import { inicioNoFuso } from "@/lib/datas";
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
};

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

/** Cria evento de agenda. Só administrador (a RLS barra os demais). */
export async function criarEventoAgenda(d: DadosEvento): Promise<R> {
  const v = validar(d);
  if (v.erro !== null) return { erro: v.erro };
  const supabase = await criarClienteServidor();
  const { data: admin } = await supabase.rpc("sou_admin");
  if (!admin) return { erro: "Só o administrador da igreja pode cadastrar eventos na agenda." };
  const { data: igrejaId } = await supabase.rpc("minha_igreja");
  const { error } = await supabase.from("eventos").insert({ igreja_id: igrejaId, so_agenda: true, ...v.ok });
  revalidatePath("/agenda");
  revalidatePath("/");
  return { erro: error ? "Não foi possível salvar o evento agora." : null };
}

export async function editarEventoAgenda(id: string, d: DadosEvento): Promise<R> {
  const v = validar(d);
  if (v.erro !== null) return { erro: v.erro };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("eventos").update(v.ok).eq("id", id).eq("so_agenda", true).select("id");
  revalidatePath("/agenda");
  if (error) return { erro: "Não foi possível salvar o evento agora." };
  return data?.length ? { erro: null } : { erro: "Evento não encontrado ou sem permissão." };
}

export async function apagarEventoAgenda(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("eventos").delete().eq("id", id).eq("so_agenda", true).select("id");
  revalidatePath("/agenda");
  if (error) return { erro: "Não foi possível apagar agora." };
  return data?.length ? { erro: null } : { erro: "Evento não encontrado ou sem permissão." };
}
