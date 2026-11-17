import Link from "next/link";

export const metadata = { title: "Política de Privacidade · Mais Conectados" };

export default function Privacidade() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-10 leading-relaxed">
      <Link href="/entrar" className="text-sm text-neutral-500 underline">← Voltar</Link>
      <h1 className="text-3xl font-semibold">Política de Privacidade</h1>
      <p className="text-sm text-neutral-500">Mais Conectados · Última atualização: 17/11/2026</p>

      <p>
        O Mais Conectados é um aplicativo de escala de voluntários para igrejas. Esta política explica quais dados usamos, para
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
        <li>
          <strong>Aviso de chegada (&quot;Cheguei&quot;):</strong> o horário em que você avisa, pelo botão, que chegou para
          servir. Para confirmar que você está na igreja, o aplicativo pede a localização do seu celular apenas no momento em que você toca em &quot;Cheguei&quot;; ela é usada só para calcular a distância até a igreja e <strong>não é guardada</strong>.
        </li>
        <li>
          <strong>Reação ao culto (MaisFeliz):</strong> o emoji que você escolhe para dizer como foi a escala. Ela é
          <strong> anônima</strong>: guardamos apenas o evento, o ministério, a nota e o dia, sem seu nome e sem o horário.
          A lista de quem já respondeu é separada da nota, para impedir respostas repetidas, e as duas não se cruzam.
        </li>
        <li>
          <strong>Pontuação:</strong> pontos calculados a partir das suas escalas (servir, chegar no horário, cobrir
          colegas, recusas e trocas) nos últimos 90 dias.
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
      <p>
        <strong>Pontuação:</strong> você vê a sua, e os coordenadores dos seus ministérios veem a do time. Não há ranking
        público. <strong>MaisFeliz:</strong> o líder vê só o resumo por culto (contagem dos emojis e média), e apenas quando há
        três respostas ou mais, para ninguém ser identificado. <strong>Cheguei:</strong> o coordenador vê quem já avisou que
        chegou.
      </p>

      <h2 className="mt-4 text-xl font-semibold">3.1. Avisos pelo aplicativo e pelo WhatsApp</h2>
      <p>
        Para que a escala funcione, enviamos avisos sobre o serviço: lembretes de escala, pedidos de troca, vagas abertas,
        comunicados e avisos de chegada para a coordenação. Eles aparecem no aplicativo (sininho) e também por mensagem de
        WhatsApp para o celular cadastrado. Enviamos apenas mensagens ligadas ao serviço, nunca publicidade. Se você não
        quiser receber mensagens no WhatsApp, avise a coordenação ou escreva para o contato abaixo e interrompemos o envio
        para o seu número, e os avisos continuam no aplicativo.
      </p>

      <h2 className="mt-4 text-xl font-semibold">4. Onde os dados ficam</h2>
      <p>
        Usamos provedores de infraestrutura para hospedar o aplicativo e o banco de dados (Supabase e Vercel), o Google
        para o login e um serviço de envio de mensagens de WhatsApp (Uazapi), que recebe apenas o número e o texto do aviso. Esses provedores tratam os dados apenas para nos prestar o serviço, com medidas de segurança como
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
