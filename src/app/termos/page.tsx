import Link from "next/link";

export const metadata = { title: "Termos de Uso · Culto360" };

export default function Termos() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-10 leading-relaxed">
      <Link href="/entrar" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-3xl font-semibold">Termos de Uso</h1>
      <p className="text-sm text-neutral-500">Culto360 · Última atualização: 16/11/2026</p>

      <h2 className="mt-4 text-xl font-semibold">1. O que é o Culto360</h2>
      <p>
        Aplicativo para organizar a escala de voluntários de igrejas: montar escalas, confirmar presença, informar
        disponibilidade, assumir vagas abertas e receber comunicados dos ministérios.
      </p>

      <h2 className="mt-4 text-xl font-semibold">2. Quem pode usar</h2>
      <p>
        O acesso é liberado pela coordenação da sua igreja, usando o e-mail que ela cadastrou para você. Entre com a conta
        Google desse e-mail. Cada pessoa usa apenas a própria conta.
      </p>

      <h2 className="mt-4 text-xl font-semibold">3. Suas responsabilidades</h2>
      <ul className="list-disc pl-6">
        <li>Manter seus dados de contato corretos e responder às escalas com antecedência.</li>
        <li>Usar o aplicativo apenas para a organização dos serviços da igreja.</li>
        <li>Não tentar acessar dados de outras pessoas ou igrejas, nem prejudicar o funcionamento do serviço.</li>
        <li>Coordenadores: publicar comunicados e escalas com respeito e apenas para o time do ministério.</li>
      </ul>

      <h2 className="mt-4 text-xl font-semibold">4. Disponibilidade do serviço</h2>
      <p>
        Trabalhamos para manter o aplicativo no ar e seguro, mas ele pode ficar indisponível por manutenção ou falhas de
        terceiros. O serviço é oferecido como está, e a organização final da escala continua sendo responsabilidade da
        coordenação de cada ministério.
      </p>

      <h2 className="mt-4 text-xl font-semibold">5. Encerramento</h2>
      <p>
        Você pode deixar de usar o aplicativo a qualquer momento e pedir a exclusão dos seus dados. A coordenação pode
        remover o acesso de quem deixou de servir.
      </p>

      <h2 className="mt-4 text-xl font-semibold">6. Privacidade</h2>
      <p>
        O tratamento dos seus dados está descrito na <Link className="underline" href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2 className="mt-4 text-xl font-semibold">7. Contato e lei aplicável</h2>
      <p>
        Dúvidas:{" "}
        <a className="underline" href="mailto:levelflowcrm@gmail.com">levelflowcrm@gmail.com</a>. Estes termos seguem a
        legislação brasileira.
      </p>
    </main>
  );
}
