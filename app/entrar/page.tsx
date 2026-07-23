import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { getAuthConfiguration } from "@/lib/auth";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre com sua conta Google para salvar seu progresso.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

function safeCallback(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/painel";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackURL = safeCallback(params.next);
  const configuration = getAuthConfiguration();

  return (
    <main className={styles.page}>
      <section className={styles.story}>
        <Link className={styles.brand} href="/">
          <strong>OAB</strong> Questões
        </Link>
        <div>
          <p>SEU ESTUDO, SEMPRE COM VOCÊ</p>
          <h1>Continue exatamente de onde parou.</h1>
          <span>
            Sua conta mantém simulados, respostas e estatísticas sincronizados com segurança.
          </span>
        </div>
        <blockquote>
          “O resultado mais útil não é apenas a nota. É saber qual matéria merece a próxima hora.”
        </blockquote>
      </section>

      <section className={styles.signInPanel}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>ACESSO À PLATAFORMA</p>
          <h2>Entre ou crie sua conta</h2>
          <p className={styles.description}>
            Usamos o Google para uma entrada simples e segura. Nenhuma senha adicional será criada.
          </p>

          <GoogleSignInButton callbackURL={callbackURL} disabled={!configuration.configured} />

          {!configuration.configured && (
            <div className={styles.setupNotice} role="status">
              <strong>Login ainda não configurado</strong>
              <p>
                As credenciais do Google e do banco precisam ser adicionadas ao ambiente antes do primeiro acesso.
              </p>
              {process.env.NODE_ENV !== "production" && (
                <small>
                  Pendentes: {configuration.issues.map((issue) => issue.variable).join(", ")}
                </small>
              )}
            </div>
          )}

          <div className={styles.freeSummary}>
            <span>INCLUÍDO NO GRATUITO</span>
            <ul>
              <li>1 simulado completo</li>
              <li>Estatísticas básicas</li>
              <li>Progresso sincronizado</li>
            </ul>
          </div>

          <p className={styles.terms}>
            Ao continuar, você concorda com os termos e a política de privacidade que serão publicados antes do lançamento.
          </p>
        </div>
        <Link className={styles.back} href="/">← Voltar ao início</Link>
      </section>
    </main>
  );
}
