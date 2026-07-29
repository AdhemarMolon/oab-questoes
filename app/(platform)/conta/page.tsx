import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { Badge } from "@/components/ui";
import { getUserAccess } from "@/lib/data/access";
import { requireUser } from "@/lib/session";

import { deleteOwnAccountAction } from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Minha conta" };

type AccountSearchParams = {
  erro?: string | string[];
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<AccountSearchParams>;
}) {
  const [session, params] = await Promise.all([requireUser(), searchParams]);
  const access = await getUserAccess(session.user.id);
  const errorMessage = Array.isArray(params.erro)
    ? params.erro[0]
    : params.erro;

  return (
    <main className={styles.page} id="main-content">
      <header>
        <p>MINHA CONTA</p>
        <h1>Perfil e acesso</h1>
        <span>Seus dados de identidade são fornecidos pela conta Google.</span>
      </header>

      {errorMessage ? (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      ) : null}

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
          <p>{access.hasFullAccess ? "Você pode usar todo o acervo, novos simulados e estatísticas avançadas." : "Você pode fazer e refazer o simulado gratuito, mantendo suas estatísticas básicas."}</p>
          {access.fullAccessEndsAt && <small>Válido até {new Intl.DateTimeFormat("pt-BR").format(access.fullAccessEndsAt)}</small>}
          <Link href={access.hasFullAccess ? "/simulados" : "/planos"}>{access.hasFullAccess ? "Ir para simulados →" : "Conhecer modalidades →"}</Link>
        </section>
      </div>

      <section className={styles.note}>
        <strong>Cobranças ainda não estão ativas.</strong>
        <p>A estrutura distingue mensal, anual, vitalício e presente. O gerenciamento financeiro será conectado quando os preços e a integração com a AbacatePay forem definidos.</p>
      </section>

      <section className={styles.privacyPanel}>
        <div>
          <span>PRIVACIDADE E CONTROLE</span>
          <h2>Seus dados, suas escolhas.</h2>
        </div>
        <p>
          Consulte como seus dados são usados ou fale diretamente com o
          responsável pela plataforma.
        </p>
        <nav>
          <Link href="/privacidade">Política de Privacidade</Link>
          <Link href="/contato">Entrar em contato</Link>
        </nav>
      </section>

      <section className={styles.dangerZone} id="excluir-conta">
        <div className={styles.dangerIntro}>
          <span>ZONA DE RISCO</span>
          <h2>Excluir minha conta</h2>
          <p>
            Remove sua identificação, vínculo com Google, sessões, favoritos e
            acessos. Tentativas podem permanecer anonimizadas para preservar
            estatísticas e registros necessários.
          </p>
        </div>

        <details>
          <summary>Quero excluir minha conta</summary>
          <div className={styles.deletionDetails}>
            <strong>Esta ação é permanente e não pode ser desfeita.</strong>
            <p>
              Seu histórico não poderá ser recuperado se você criar outra conta
              futuramente.
            </p>
            <form action={deleteOwnAccountAction}>
              <label className={styles.acknowledgement}>
                <input name="acknowledged" required type="checkbox" />
                <span>
                  Entendo que perderei o acesso e que a exclusão é irreversível.
                </span>
              </label>
              <label className={styles.confirmationField}>
                <span>Digite EXCLUIR para confirmar</span>
                <input
                  autoComplete="off"
                  name="confirmation"
                  pattern="EXCLUIR"
                  required
                  spellCheck={false}
                  type="text"
                />
              </label>
              <button type="submit">Excluir conta permanentemente</button>
            </form>
          </div>
        </details>
      </section>
    </main>
  );
}
