import Image from "next/image";
import Link from "next/link";
import { FormularioEntrar } from "./formulario";
import { InstalarApp } from "./instalar-app";

export const metadata = { title: "Entrar · Mais Conectados" };

/** Ondas laranja/azul e uma cruz em luz suave ao fundo: só enfeite, sem imagem externa. */
function FundoEntrar() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-to-b from-[#0a2a5e] via-[#071a3d] to-[#040d22]">
      <div className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-orange-400/25 blur-3xl" />
      <svg viewBox="0 0 120 160" className="absolute -right-4 top-6 h-64 w-48 text-orange-200/20" fill="currentColor">
        <rect x="52" y="0" width="16" height="160" rx="2" />
        <rect x="14" y="40" width="92" height="16" rx="2" />
      </svg>
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="absolute left-0 top-0 h-28 w-48">
        <path d="M0 0H400C300 20 160 70 0 150Z" fill="#ff8a00" />
      </svg>
      <svg viewBox="0 0 400 140" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-24 w-full">
        <path d="M0 70C90 20 190 30 270 80C320 112 360 90 400 50V140H0Z" fill="#0f4fa8" />
        <path d="M120 140C220 110 320 90 400 20V140Z" fill="#ff8a00" />
      </svg>
    </div>
  );
}

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <div className="relative isolate min-h-dvh text-white">
      <FundoEntrar />
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-7 px-5 pb-28 pt-12">
        <div className="flex flex-col items-center text-center">
          <div className="w-60 rounded-3xl bg-white p-3 shadow-lg shadow-black/30">
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
          <p className="mt-4 text-base text-blue-100/80">Igreja Nasci Pra Deus</p>
        </div>

        <div>
          <p className="text-4xl font-extrabold leading-[1.1] tracking-tight">
            Servir é o que
            <br />
            nos <span className="text-orange-400 underline decoration-orange-400 decoration-4 underline-offset-8">conecta</span>
          </p>
          <p className="mt-6 text-lg leading-snug text-blue-100/85">
            Acesse suas escalas, confirme presença e acompanhe as atividades da igreja.
          </p>
        </div>

        {erro && (
          <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/40">
            {erro === "sem-cadastro"
              ? "Este e-mail ainda não está cadastrado. Peça ao facilitador do seu ministério para cadastrar o seu Gmail e entre de novo."
              : "Não foi possível entrar. Tente de novo com o botão abaixo."}
          </p>
        )}
        <FormularioEntrar />
        <InstalarApp />

        <section className="flex flex-col gap-2 border-t border-white/15 pt-5 text-sm">
          <h2 className="font-medium">O que é o Mais Conectados</h2>
          <p className="text-blue-100/75">
            Aplicativo de escala de voluntários para igrejas. Quem serve na igreja usa o Mais Conectados para:
          </p>
          <ul className="list-disc pl-5 text-blue-100/75">
            <li>ver suas escalas e confirmar presença;</li>
            <li>avisar que chegou no dia do culto;</li>
            <li>pedir troca a um colega ou assumir vagas abertas;</li>
            <li>informar disponibilidade e receber comunicados e avisos do seu ministério.</li>
          </ul>
          <p className="text-blue-100/60">
            O acesso é liberado pelos facilitadores da sua igreja. Usamos apenas seu nome e e-mail do Google para identificar você.
          </p>
        </section>
        <p className="text-center text-xs text-blue-100/60">
          Ao entrar, você concorda com os <Link className="underline" href="/termos">Termos de Uso</Link> e a{" "}
          <Link className="underline" href="/privacidade">Política de Privacidade</Link>.
        </p>
      </main>
    </div>
  );
}
