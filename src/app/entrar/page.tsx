import { FormularioEntrar } from "./formulario";

export const metadata = { title: "Entrar · Escala de Voluntários" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Igreja Nasci Pra Deus</p>
        <h1 className="mt-1 text-2xl font-semibold">Escala de Voluntários</h1>
        <p className="mt-2 text-neutral-500">Entre para ver suas escalas e confirmar presença.</p>
      </div>
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          O link expirou ou já foi usado. Peça um novo abaixo.
        </p>
      )}
      <FormularioEntrar />
    </main>
  );
}
