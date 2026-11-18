import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { CONTRIBUICAO } from "@/lib/pix";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoCopiar } from "./botao-copiar";

export const metadata = { title: "Apoie o Mais Conectados" };

export default async function Contribuir() {
  const supabase = await criarClienteServidor();
  const { data: eu } = await supabase.rpc("minha_pessoa");
  if (!eu) redirect("/sem-cadastro");

  const codigo = CONTRIBUICAO.codigo;
  const qr = await QRCode.toString(codigo, { type: "svg", margin: 1, width: 192 });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <header>
        <p className="text-3xl" aria-hidden>💙</p>
        <h1 className="mt-1 text-2xl font-semibold">Apoie o Mais Conectados</h1>
      </header>

      <p className="text-neutral-600 dark:text-neutral-300">
        O Mais Conectados foi feito para servir bem quem serve na igreja, e é <strong>gratuito</strong> para você usar.
        Manter o app no ar, com segurança e novidades, tem custo e dá trabalho: servidor, domínio e muitas horas de
        desenvolvimento.
      </p>
      <p className="text-neutral-600 dark:text-neutral-300">
        Se o app ajuda você e o seu ministério, você pode contribuir com o valor que quiser para a continuidade e o
        desenvolvimento dele. É totalmente <strong>opcional</strong>: nada muda no seu acesso se você não contribuir.
      </p>

      <section className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Contribua por PIX</h2>
        <div
          className="rounded-xl bg-white p-2 [&>svg]:h-48 [&>svg]:w-48"
          aria-label="QR Code do PIX"
          role="img"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="text-center text-sm text-neutral-500">
          Abra o app do seu banco, escolha pagar com PIX e leia o QR Code, ou copie o código e use “PIX copia e cola”.
          Você escolhe o valor.
        </p>
        <p className="text-xs text-neutral-500">Favorecido: {CONTRIBUICAO.favorecido}</p>
        <div className="flex w-full flex-col gap-2">
          <BotaoCopiar texto={codigo} rotulo="Copiar código PIX (copia e cola)" />
        </div>
      </section>

      <p className="text-center text-sm text-neutral-500">Obrigado por fazer parte e por servir. Deus abençoe! 🙏</p>
    </main>
  );
}
