import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Badge } from "@/components/ui";
import { getUserAccess } from "@/lib/data/access";
import { requireUser } from "@/lib/session";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const session = await requireUser();
  const access = await getUserAccess(session.user.id);
  return (
    <main className={styles.page} id="main-content">
      <header>
        <p>MINHA CONTA</p>
        <h1>Perfil e acesso</h1>
        <span>Seus dados de identidade são fornecidos pela conta Google.</span>
      </header>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <div className={styles.profile}>
            <span aria-hidden="true">{session.user.name.charAt(0).toUpperCase()}</span>
            <div><h2>{session.user.name}</h2><p>{session.user.email}</p></div>
          </div>
          <dl>
            <div><dt>Login</dt><dd>Google OAuth</dd></div>
            <div><dt>E-mail verificado</dt><dd>{session.user.emailVerified ? "Sim" : "Pendente"}</dd></div>
            <div><dt>Função</dt><dd>{session.user.role === "admin" ? "Administrador" : "Usuário"}</dd></div>
          </dl>
          <div className={styles.signOut}><SignOutButton /></div>
        </section>

        <section className={`${styles.panel} ${styles.accessPanel}`}>
          <div className={styles.panelTop}><span>SEU PLANO</span><Badge variant={access.hasFullAccess ? "premium" : "neutral"}>{access.hasFullAccess ? access.effectivePlan : "FREE"}</Badge></div>
          <h2>{access.hasFullAccess ? "Acesso completo ativo" : "Acesso gratuito"}</h2>
          <p>{access.hasFullAccess ? "Você pode usar todo o acervo, novos simulados e estatísticas avançadas." : "Você tem direito a um simulado completo e estatísticas básicas."}</p>
          {access.fullAccessEndsAt && <small>Válido até {new Intl.DateTimeFormat("pt-BR").format(access.fullAccessEndsAt)}</small>}
          <Link href={access.hasFullAccess ? "/simulados" : "/planos"}>{access.hasFullAccess ? "Ir para simulados →" : "Conhecer modalidades →"}</Link>
        </section>
      </div>

      <section className={styles.note}>
        <strong>Cobranças ainda não estão ativas.</strong>
        <p>A estrutura distingue mensal, anual, vitalício e presente. O gerenciamento financeiro será conectado quando os preços e a integração com a AbacatePay forem definidos.</p>
      </section>
    </main>
  );
}
