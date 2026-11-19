"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type DadosMetricas = {
  online: number | null; visitantes: number | null; simPraJesus: number | null;
  naveVazias: number | null; galeriaVazias: number | null; carros: number | null; motos: number | null;
  areas: { areaId: string; qtd: number | null }[];
};

/** Grava a ficha de contagem do evento. O banco confere permissão e limites. */
export async function salvarMetricas(evento: string, d: DadosMetricas): Promise<{ erro: string | null }> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_metricas", {
    p_evento: evento,
    p_dados: {
      online: d.online, visitantes: d.visitantes, sim_pra_jesus: d.simPraJesus,
      nave_vazias: d.naveVazias, galeria_vazias: d.galeriaVazias, carros: d.carros, motos: d.motos,
      areas: d.areas.map((a) => ({ area_id: a.areaId, qtd: a.qtd })),
    },
  });
  if (error) return { erro: error.message };
  revalidatePath("/metricas");
  revalidatePath(`/metricas/${evento}`);
  return { erro: null };
}
