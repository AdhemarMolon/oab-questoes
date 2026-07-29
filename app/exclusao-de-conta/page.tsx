import type { Metadata } from "next";

import {
  LegalPageShell,
  legalPageStyles as styles,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Exclusão de conta",
  description:
    "Saiba como excluir sua conta e seus dados pessoais da Minha OAB.",
};

export default function AccountDeletionPage() {
  return (
    <LegalPageShell
      description="Você pode encerrar o acesso e remover sua identificação diretamente pela plataforma ou solicitar ajuda ao responsável."
      eyebrow="Privacidade e controle"
      title="Exclusão de conta"
      updatedAt="28 de julho de 2026"
    >
      <section>
        <h2>Excluir pela plataforma</h2>
        <ol>
          <li>Entre com a conta Google que deseja excluir.</li>
          <li>
            Acesse <a href="/conta#excluir-conta">Minha conta</a>.
          </li>
          <li>Abra “Excluir minha conta” e leia as consequências.</li>
          <li>Marque a confirmação, escreva EXCLUIR e conclua.</li>
        </ol>
        <p className={styles.notice}>
          A exclusão é irreversível. Todas as sessões serão encerradas e o
          histórico não poderá ser recuperado para uma nova conta.
        </p>
        <div className={styles.actions}>
          <a className={styles.primaryAction} href="/conta#excluir-conta">
            Ir para Minha conta
          </a>
        </div>
      </section>

      <section>
        <h2>O que acontece com os dados</h2>
        <ul>
          <li>
            Nome, e-mail, foto, vínculo com Google, sessões, favoritos e
            recibos de comunicados são removidos.
          </li>
          <li>Benefícios e acessos ativos são encerrados.</li>
          <li>
            Tentativas e respostas podem permanecer sem identificação pessoal
            para estatísticas e integridade do serviço.
          </li>
          <li>
            Registros necessários para obrigação legal, segurança, prevenção a
            fraude ou exercício de direitos podem ser retidos pelo prazo
            aplicável.
          </li>
        </ul>
      </section>

      <section>
        <h2>Não consegue acessar?</h2>
        <p>
          Envie a solicitação pelo e-mail usado na conta para{" "}
          <a href="mailto:molonaron3@gmail.com">molonaron3@gmail.com</a> ou fale
          pelo telefone e WhatsApp{" "}
          <a href="tel:+5511971809311">+55 11 97180-9311</a>. Para impedir a
          exclusão indevida de terceiros, poderá ser solicitada confirmação de
          identidade.
        </p>
        <div className={styles.actions}>
          <a
            className={styles.primaryAction}
            href="mailto:molonaron3@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20conta"
          >
            Solicitar por e-mail
          </a>
          <a
            className={styles.secondaryAction}
            href="https://wa.me/5511971809311"
            rel="noreferrer"
            target="_blank"
          >
            Falar pelo WhatsApp
          </a>
        </div>
      </section>
    </LegalPageShell>
  );
}
