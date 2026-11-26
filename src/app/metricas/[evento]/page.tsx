import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fmtDataHora } from "@/lib/datas";
import { carregarContexto, carregarFichas } from "@/lib/metricas-dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioMetricas } from "./formulario";

// Salvar e enviar o relatório gera o PDF, chama a IA e manda por WhatsApp: precisa de mais tempo que o padrão.
export const maxDuration = 60;

export default async function ContagemDoEvento({ params }: { params: Promise<{ evento: string }> }) {
  const { evento } = await params;
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: pode } = await supabase.rpc("pode_ver_metricas");
  if (!pode) redirect("/");

  const { data: ev } = await supabase.from("eventos").select("id, titulo, inicio").eq("id", evento).maybeSingle();
  if (!ev) notFound();
  const inicio = new Date(ev.inicio);
  const ctx = await carregarContexto(supabase);
  const [f] = await carregarFichas(supabase, new Date(inicio.getTime() - 1000), new Date(inicio.getTime() + 1000));
  const [{ count: destinatarios }, { data: ultimo }] = await Promise.all([
    supabase.from("metricas_destinatarios").select("id", { count: "exact", head: true }),
    supabase.from("metricas_relatorios").select("enviado_em, destinatarios").eq("evento_id", evento).order("enviado_em", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const cedo = inicio.getTime() > Date.now() + 12 * 3_600_000;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/metricas" className="text-sm text-neutral-500 underline">← Métricas dos cultos</Link>
      <h1 className="text-2xl font-semibold">{ev.titulo}</h1>
      <p className="capitalize text-neutral-500">{fmtDataHora.format(inicio)}</p>
      {cedo ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Esse evento ainda não começou. A contagem abre 12 horas antes do início.</p>
      ) : (
        <FormularioMetricas
          evento={evento}
          areas={ctx.areas}
          cadeiras={ctx.cadeiras}
          relatorio={{ destinatarios: destinatarios ?? 0, ultimo: ultimo ? { em: ultimo.enviado_em, destinatarios: ultimo.destinatarios } : null }}
          auto={{ escalados: f?.autoEscalados ?? null, presentes: f?.autoPresentes ?? null }}
          inicial={{ online: f?.online ?? null, visitantes: f?.visitantes ?? null, simPraJesus: f?.simPraJesus ?? null, naveVazias: f?.naveVazias ?? null, galeriaVazias: f?.galeriaVazias ?? null, carros: f?.carros ?? null, motos: f?.motos ?? null, areas: f?.areas ?? {} }}
        />
      )}
    </main>
  );
}
