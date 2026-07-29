import type { Metadata } from "next";

import {
  LegalPageShell,
  legalPageStyles as styles,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Entre em contato com o responsável pela plataforma Minha OAB.",
};

export default function ContactPage() {
  return (
    <LegalPageShell
      description="Use um dos canais abaixo para suporte, dúvidas sobre conteúdo, privacidade ou acesso à plataforma."
      eyebrow="Fale com o responsável"
      title="Contato"
    >
      <section>
        <h2>Canais de atendimento</h2>
        <p>
          Para facilitar o atendimento, informe o e-mail usado na conta e
          descreva o problema sem enviar senhas, códigos de acesso ou dados
          completos de pagamento.
        </p>

        <div className={styles.contactGrid}>
          <a
            className={styles.contactCard}
            href="mailto:molonaron3@gmail.com"
          >
            <span>E-MAIL</span>
            <strong>molonaron3@gmail.com</strong>
            <small>Acesso, conteúdo e privacidade</small>
          </a>
          <a className={styles.contactCard} href="tel:+5511971809311">
            <span>TELEFONE</span>
            <strong>+55 11 97180-9311</strong>
            <small>Ligação pelo seu dispositivo</small>
          </a>
        </div>

        <div className={styles.actions}>
          <a
            className={styles.primaryAction}
            href="https://wa.me/5511971809311"
            rel="noreferrer"
            target="_blank"
          >
            Conversar pelo WhatsApp
          </a>
          <a
            className={styles.secondaryAction}
            href="mailto:molonaron3@gmail.com"
          >
            Enviar e-mail
          </a>
        </div>
      </section>

      <section>
        <h2>Privacidade e exclusão</h2>
        <p>
          Solicitações relacionadas aos seus dados também podem ser feitas por
          esses canais. Para exclusão imediata pela própria conta, consulte{" "}
          <a href="/exclusao-de-conta">as instruções de exclusão</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
