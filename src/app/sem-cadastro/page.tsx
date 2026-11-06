import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "../acoes";

export default async function SemCadastro() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Quase lá!</h1>
      <p className="text-neutral-500">
        O e-mail <strong className="text-neutral-800 dark:text-neutral-200">{user?.email}</strong> ainda não está ligado
        a nenhum voluntário. Mande esse e-mail para o coordenador do seu ministério cadastrar, e depois entre de novo.
      </p>
      <form action={sair}>
        <button className="h-11 w-full rounded-xl border border-neutral-300 font-medium dark:border-neutral-700">
          Entrar com outro e-mail
        </button>
      </form>
    </main>
  );
}
