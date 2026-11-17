import Image from "next/image";
import Link from "next/link";
import { FormularioEntrar } from "./formulario";
import { InstalarApp } from "./instalar-app";

export const metadata = { title: "Entrar · Mais Conectados" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div>
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700">
          <Image
            src="/logo-mais-conectados.png"
            alt="Mais Conectados — Conectados para servir"
            width={900}
            height={547}
            priority
            className="h-auto w-full"
          />
        </div>
        <h1 className="sr-only">Mais Conectados</h1>
        <p className="mt-4 text-sm font-medium text-violet-600 dark:text-violet-400">Igreja Nasci Pra Deus</p>
        <p className="mt-1 text-neutral-500">Entre para ver suas escalas e confirmar presença.</p>
      </div>
      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {erro === "sem-cadastro"
            ? "Este e-mail ainda não está cadastrado. Peça ao coordenador do seu ministério para cadastrar o seu Gmail e entre de novo."
            : "Não foi possível entrar. Tente de novo com o botão abaixo."}
        </p>
      )}
      <FormularioEntrar />
      <InstalarApp />
      <section className="flex flex-col gap-2 border-t border-neutral-200 pt-5 text-sm dark:border-neutral-800">
        <h2 className="font-medium">O que é o Mais Conectados</h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          Aplicativo de escala de voluntários para igrejas. Quem serve na igreja usa o Mais Conectados para:
        </p>
        <ul className="list-disc pl-5 text-neutral-600 dark:text-neutral-300">
          <li>ver suas escalas e confirmar presença;</li>
          <li>avisar que chegou no dia do culto;</li>
          <li>pedir troca a um colega ou assumir vagas abertas;</li>
          <li>informar disponibilidade e receber comunicados e avisos do seu ministério.</li>
        </ul>
        <p className="text-neutral-500">
          O acesso é liberado pela coordenação da sua igreja. Usamos apenas seu nome e e-mail do Google para identificar você.
        </p>
      </section>
      <p className="text-center text-xs text-neutral-500">
        Ao entrar, você concorda com os <Link className="underline" href="/termos">Termos de Uso</Link> e a{" "}
        <Link className="underline" href="/privacidade">Política de Privacidade</Link>.
      </p>
    </main>
  );
}
