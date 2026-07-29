import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalPageShell,
  legalPageStyles as styles,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Conta excluída",
  description: "Confirmação de exclusão da conta Minha OAB.",
};

export default function DeletedAccountPage() {
  return (
    <LegalPageShell
      description="Sua identificação e suas credenciais de acesso foram removidas da plataforma."
      eyebrow="Solicitação concluída"
      title="Sua conta foi excluída."
    >
      <section>
        <h2>Exclusão concluída</h2>
        <p>
          Todas as sessões foram encerradas. Tentativas e respostas que
          precisem permanecer para estatísticas ou integridade do sistema não
          estão mais associadas ao seu nome, e-mail ou conta Google.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/">
            Voltar ao início
          </Link>
          <Link className={styles.secondaryAction} href="/contato">
            Falar com o responsável
          </Link>
        </div>
      </section>
    </LegalPageShell>
  );
}
