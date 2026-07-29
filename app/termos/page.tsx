import type { Metadata } from "next";

import {
  LegalPageShell,
  legalPageStyles as styles,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Conheça as condições para utilizar a plataforma Minha OAB.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      description="Estas condições estabelecem as regras para criar uma conta e utilizar os conteúdos, simulados e estatísticas da Minha OAB."
      eyebrow="Condições do serviço"
      title="Termos de Uso"
      updatedAt="28 de julho de 2026"
    >
      <section>
        <h2>1. Aceitação</h2>
        <p>
          Ao acessar ou criar uma conta na Minha OAB, você declara que leu e
          concorda com estes Termos e com a{" "}
          <a href="/privacidade">Política de Privacidade</a>. Se não concordar,
          não utilize as áreas autenticadas do serviço.
        </p>
      </section>

      <section>
        <h2>2. Finalidade da plataforma</h2>
        <p>
          A Minha OAB oferece ferramentas educacionais para preparação da 1ª
          fase do Exame de Ordem, incluindo questões, simulados, histórico e
          estatísticas.
        </p>
        <p className={styles.notice}>
          O serviço não representa, não é patrocinado e não substitui
          publicações oficiais da OAB ou da organizadora do exame. O conteúdo é
          educacional e não garante aprovação.
        </p>
      </section>

      <section>
        <h2>3. Conta e acesso</h2>
        <ul>
          <li>O acesso é pessoal e realizado por uma conta Google válida.</li>
          <li>
            Você é responsável por proteger sua conta Google e por avisar sobre
            uso não autorizado.
          </li>
          <li>
            Não é permitido compartilhar acesso, automatizar consultas,
            contornar limitações ou interferir na segurança da plataforma.
          </li>
          <li>
            Contas envolvidas em fraude, abuso ou violação destes Termos podem
            ser suspensas, com possibilidade de contato para esclarecimento.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Acesso gratuito e planos</h2>
        <p>
          O acesso gratuito e os recursos incluídos são informados nas páginas
          da plataforma. Os preços, a periodicidade e a modalidade de cada
          plano pago são apresentados antes da abertura do checkout.
        </p>
        <p>
          Os planos mensal e anual são recorrentes e renovados automaticamente
          até o cancelamento. O plano vitalício consiste em um pagamento único.
          Assinaturas podem ser canceladas em <a href="/conta">Minha conta</a>;
          conforme informado na confirmação, o cancelamento é imediato e
          interrompe as cobranças futuras e o acesso ligado à assinatura.
        </p>
        <p>
          Os pagamentos são processados pela AbacatePay. A liberação depende da
          confirmação enviada pelo provedor. Reembolsos, arrependimento e demais
          direitos assegurados pela legislação de consumo permanecem aplicáveis
          independentemente destes Termos.
        </p>
      </section>

      <section>
        <h2>5. Conteúdo e correções</h2>
        <p>
          A plataforma procura manter as questões e gabaritos corretos, mas
          conteúdos marcados como “Fonte em conferência” ainda aguardam
          validação documental. Alterações legislativas, recursos e anulações
          podem modificar respostas anteriormente divulgadas.
        </p>
        <p>
          Suspeitas de erro podem ser enviadas para{" "}
          <a href="mailto:molonaron3@gmail.com">molonaron3@gmail.com</a> ou pelo
          telefone e WhatsApp{" "}
          <a href="tel:+5511971809311">+55 11 97180-9311</a>.
        </p>
      </section>

      <section>
        <h2>6. Propriedade intelectual</h2>
        <p>
          O código, identidade visual, organização, textos próprios e
          funcionalidades da Minha OAB são protegidos pela legislação
          aplicável. Questões oficiais permanecem sujeitas aos direitos e às
          regras de suas fontes.
        </p>
        <p>
          O acesso ao serviço não autoriza copiar o acervo em massa, revender,
          redistribuir, remover créditos ou explorar comercialmente a
          plataforma sem autorização.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidade e responsabilidade</h2>
        <p>
          Podem ocorrer interrupções para manutenção, falhas de fornecedores ou
          eventos fora do controle razoável da plataforma. Sempre que possível,
          serão adotadas medidas para restaurar o serviço e preservar o
          progresso salvo.
        </p>
        <p>
          Nada nestes Termos exclui garantias, responsabilidades ou direitos que
          não possam ser afastados pela legislação brasileira.
        </p>
      </section>

      <section>
        <h2>8. Encerramento e exclusão</h2>
        <p>
          Você pode parar de utilizar o serviço a qualquer momento e solicitar
          a exclusão em <a href="/conta">Minha conta</a>. O procedimento e as
          hipóteses de retenção estão descritos na{" "}
          <a href="/privacidade">Política de Privacidade</a> e na página de{" "}
          <a href="/exclusao-de-conta">Exclusão de conta</a>.
        </p>
      </section>

      <section>
        <h2>9. Alterações, legislação e contato</h2>
        <p>
          Estes Termos podem ser atualizados para refletir mudanças no serviço
          ou na legislação. A versão vigente indicará a data de atualização.
        </p>
        <p>
          Aplica-se a legislação brasileira, inclusive as normas de proteção de
          dados e de defesa do consumidor quando pertinentes. O foro competente
          será determinado conforme a legislação aplicável.
        </p>
        <p>
          Para falar com o responsável, acesse a página de{" "}
          <a href="/contato">Contato</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
