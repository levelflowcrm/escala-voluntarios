import Link from "next/link";

export const metadata = { title: "Política de Privacidade · Culto360" };

export default function Privacidade() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-10 leading-relaxed">
      <Link href="/entrar" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-3xl font-semibold">Política de Privacidade</h1>
      <p className="text-sm text-neutral-500">Culto360 · Última atualização: 16/11/2026</p>

      <p>
        O Culto360 é um aplicativo de escala de voluntários para igrejas. Esta política explica quais dados usamos, para
        quê, e como você pode exercer seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2 className="mt-4 text-xl font-semibold">1. Quais dados coletamos</h2>
      <ul className="list-disc pl-6">
        <li>
          <strong>Dados de login Google:</strong> nome e e-mail da sua conta Google, usados apenas para identificar você
          e liberar seu acesso. Não acessamos seus e-mails, contatos, arquivos ou qualquer outro dado da sua conta Google.
        </li>
        <li>
          <strong>Dados cadastrados pela igreja ou por você:</strong> nome, nome completo, e-mail, celular/WhatsApp e
          data de aniversário.
        </li>
        <li>
          <strong>Dados de uso do serviço:</strong> ministérios e funções em que você serve, escalas, confirmações,
          recusas e motivos informados, disponibilidade, períodos de ausência e comunicados.
        </li>
      </ul>

      <h2 className="mt-4 text-xl font-semibold">2. Para que usamos</h2>
      <p>
        Montar e divulgar escalas, pedir sua confirmação, encontrar substitutos quando você não pode servir, enviar
        comunicados do seu ministério e manter o contato com a equipe. Não usamos seus dados para publicidade e não os
        vendemos.
      </p>

      <h2 className="mt-4 text-xl font-semibold">3. Quem vê seus dados</h2>
      <p>
        Os coordenadores dos ministérios em que você serve e os demais voluntários da mesma igreja veem seu nome e sua
        escala. Seu celular, e-mail e aniversário ficam visíveis apenas para a coordenação. Pessoas de outras igrejas não
        têm acesso.
      </p>

      <h2 className="mt-4 text-xl font-semibold">4. Onde os dados ficam</h2>
      <p>
        Usamos provedores de infraestrutura para hospedar o aplicativo e o banco de dados (Supabase e Vercel) e o Google
        para o login. Esses provedores tratam os dados apenas para nos prestar o serviço, com medidas de segurança como
        conexão criptografada e controle de acesso por igreja.
      </p>

      <h2 className="mt-4 text-xl font-semibold">5. Por quanto tempo</h2>
      <p>
        Mantemos seus dados enquanto você fizer parte da igreja no aplicativo. Quando você sair ou pedir a exclusão,
        removemos ou anonimizamos seus dados, salvo obrigação legal de guarda.
      </p>

      <h2 className="mt-4 text-xl font-semibold">6. Seus direitos</h2>
      <p>
        Você pode pedir confirmação de que tratamos seus dados, acesso, correção, exclusão, portabilidade e informação
        sobre compartilhamento, além de revogar o consentimento. Parte dos dados de contato você mesmo edita na tela
        &quot;Meu perfil&quot;. Para os demais pedidos, fale com a coordenação da sua igreja ou escreva para o contato abaixo.
      </p>

      <h2 className="mt-4 text-xl font-semibold">7. Contato</h2>
      <p>
        Dúvidas ou pedidos sobre seus dados:{" "}
        <a className="underline" href="mailto:levelflowcrm@gmail.com">levelflowcrm@gmail.com</a>.
      </p>

      <h2 className="mt-4 text-xl font-semibold">8. Mudanças nesta política</h2>
      <p>Se esta política mudar, a nova versão aparece nesta página com a data de atualização.</p>

      <p className="text-sm text-neutral-500">
        Veja também os <Link className="underline" href="/termos">Termos de Uso</Link>.
      </p>
    </main>
  );
}
