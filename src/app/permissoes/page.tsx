import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TelaPermissoes, type PessoaPerm } from "./tela";

export default async function Permissoes() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");
  const { data: admin } = await supabase.rpc("sou_admin");
  if (!admin) redirect("/");
  const { data: master } = await supabase.rpc("sou_admin_master");

  const [{ data: pessoas }, { data: ministerios }] = await Promise.all([
    supabase.rpc("equipe_permissoes"),
    supabase.from("ministerios").select("id, nome").order("nome"),
  ]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-2xl font-semibold">Permissões</h1>
      <p className="text-sm text-neutral-500">
        Administradores têm acesso total. Coordenadores montam a escala do ministério e cuidam do time.
        {!master && " Só o administrador master promove outros administradores."}
      </p>
      <TelaPermissoes
        pessoas={(pessoas ?? []) as PessoaPerm[]}
        ministerios={(ministerios ?? []) as { id: string; nome: string }[]}
        souMaster={!!master}
        euId={eu as string}
      />
    </main>
  );
}
