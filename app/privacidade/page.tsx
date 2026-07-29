import type { Metadata } from "next";

import {
  LegalPageShell,
  legalPageStyles as styles,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Saiba como a Minha OAB coleta, utiliza, protege e elimina dados pessoais.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      description="Este documento explica, de forma clara, quais dados são usados para prestar o serviço e como você pode exercer seus direitos."
      eyebrow="Privacidade e proteção de dados"
      title="Política de Privacidade"
      updatedAt="28 de julho de 2026"
    >
      <section>
        <h2>1. Quem trata seus dados</h2>
        <p>
          A plataforma Minha OAB é responsável pelas decisões relacionadas ao
          tratamento dos dados pessoais utilizados no serviço. Para dúvidas ou
          solicitações relacionadas à privacidade, escreva para{" "}
          <a href="mailto:molonaron3@gmail.com">molonaron3@gmail.com</a> ou
          entre em contato pelo telefone e WhatsApp{" "}
          <a href="tel:+5511971809311">+55 11 97180-9311</a>.
        </p>
      </section>

      <section>
        <h2>2. Dados que utilizamos</h2>
        <ul>
          <li>
            <strong>Identificação:</strong> nome, e-mail, foto e identificador
            fornecidos no login com Google.
          </li>
          <li>
            <strong>Conta e segurança:</strong> sessões, endereço IP, navegador,
            datas de acesso e registros necessários para prevenir abuso.
          </li>
          <li>
            <strong>Atividade de estudo:</strong> respostas, tentativas, pausas,
            resultados, questões favoritas e progresso por disciplina.
          </li>
          <li>
            <strong>Acesso e cobrança:</strong> plano, concessões de acesso e,
            quando os pagamentos forem ativados, informações da transação. A
            plataforma não pretende armazenar os dados completos do cartão.
          </li>
          <li>
            <strong>Atendimento:</strong> conteúdo das mensagens enviadas pelos
            canais de contato.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Para que os dados são usados</h2>
        <p>Os dados são tratados para:</p>
        <ul>
          <li>autenticar sua conta e manter o progresso sincronizado;</li>
          <li>corrigir respostas e gerar estatísticas de estudo;</li>
          <li>controlar o acesso gratuito e os recursos de cada plano;</li>
          <li>prestar suporte e enviar comunicados dentro da plataforma;</li>
          <li>proteger usuários, investigar falhas e prevenir fraudes;</li>
          <li>cumprir obrigações legais e regulatórias aplicáveis.</li>
        </ul>
        <p className={styles.notice}>
          Conforme o contexto, o tratamento pode se apoiar na execução do
          serviço solicitado, no cumprimento de obrigação legal, no exercício
          regular de direitos, em interesse legítimo compatível com seus
          direitos ou em consentimento específico.
        </p>
      </section>

      <section>
        <h2>4. Compartilhamento e infraestrutura</h2>
        <p>
          Os dados podem ser processados por fornecedores indispensáveis à
          operação, como Google para autenticação, Neon para banco de dados,
          serviços de hospedagem e, futuramente, o provedor de pagamentos.
          Esses fornecedores recebem somente os dados necessários às suas
          funções e estão sujeitos às próprias políticas e obrigações legais.
        </p>
        <p>
          Alguns fornecedores podem operar infraestrutura fora do Brasil. Nessa
          situação, serão adotadas medidas compatíveis com as regras aplicáveis
          à transferência internacional de dados.
        </p>
        <p>
          Informações pessoais não são vendidas. As estatísticas públicas de
          provas não usam resultados identificáveis dos alunos.
        </p>
      </section>

      <section>
        <h2>5. Cookies e sessão</h2>
        <p>
          A plataforma utiliza cookies estritamente necessários para manter o
          login, proteger a sessão e concluir a autenticação com Google. Caso
          ferramentas opcionais de análise ou publicidade sejam adicionadas,
          esta política e os controles de consentimento serão atualizados.
        </p>
      </section>

      <section>
        <h2>6. Retenção e exclusão</h2>
        <p>
          Os dados da conta são mantidos enquanto ela estiver ativa ou enquanto
          forem necessários para prestar o serviço. Ao solicitar a exclusão, o
          vínculo com Google, sessões, identidade visível, favoritos e recibos
          de comunicados são removidos.
        </p>
        <p>
          Tentativas, respostas e registros técnicos podem ser conservados de
          forma anonimizada para preservar estatísticas, segurança e
          integridade do sistema. Registros financeiros ou de auditoria podem
          permanecer pelo período exigido para obrigação legal, prevenção a
          fraude ou exercício regular de direitos.
        </p>
      </section>

      <section>
        <h2>7. Seus direitos</h2>
        <p>
          Nos termos da LGPD, você pode solicitar confirmação e acesso,
          correção, informação sobre compartilhamento, portabilidade quando
          aplicável, revogação de consentimento, oposição e anonimização,
          bloqueio ou eliminação de dados nas hipóteses legais.
        </p>
        <p>
          A exclusão da conta pode ser iniciada em{" "}
          <a href="/conta">Minha conta</a>. Se não conseguir acessar, consulte
          as instruções em <a href="/exclusao-de-conta">Exclusão de conta</a>{" "}
          ou use os canais de contato. Poderá ser solicitada confirmação de
          identidade para proteger seus dados.
        </p>
      </section>

      <section>
        <h2>8. Segurança e alterações</h2>
        <p>
          São adotadas medidas técnicas e administrativas destinadas a reduzir
          acessos indevidos, perda e alteração não autorizada. Nenhum ambiente
          digital, contudo, elimina todos os riscos.
        </p>
        <p>
          Esta política poderá ser atualizada quando o serviço, os fornecedores
          ou a legislação mudarem. A data da versão vigente aparecerá no início
          desta página.
        </p>
      </section>
    </LegalPageShell>
  );
}
