import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { emOrdemAlfabetica, type TipoEvento } from "@/lib/tipos-evento";
import { TelaTipos } from "./tela";

export default async function TiposDeEvento() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: master } = await supabase.rpc("sou_admin_master");
  if (!master) redirect("/agenda");

  const { data } = await supabase.from("tipos_evento").select("id, nome, cor, ativo").is("dia_semana", null);
  const { data: usados } = await supabase.from("eventos").select("tipo_evento_id").not("tipo_evento_id", "is", null);
  const usos: Record<string, number> = {};
  for (const e of usados ?? []) usos[e.tipo_evento_id as string] = (usos[e.tipo_evento_id as string] ?? 0) + 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/agenda" className="text-sm text-neutral-500 underline">← Agenda</Link>
      <h1 className="text-2xl font-semibold">Tipos de evento</h1>
      <p className="text-sm text-neutral-500">
        Os tipos aparecem na hora de cadastrar um evento na agenda. Renomear vale para os eventos já criados; excluir não apaga os eventos, só tira o tipo deles. Cada tipo pode ter uma cor padrão. Os cultos fixos da semana ficam em Cultos fixos.
      </p>
      <TelaTipos tipos={emOrdemAlfabetica((data ?? []) as TipoEvento[])} usos={usos} />
    </main>
  );
}
