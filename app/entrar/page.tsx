import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SiteFooter } from "@/components/shell";
import { getAuthConfiguration } from "@/lib/auth";
import { getCurrentSession } from "@/lib/session";

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
  return candidate?.startsWith("/") &&
    !candidate.startsWith("//") &&
    candidate !== "/entrar" &&
    !candidate.startsWith("/entrar?")
    ? candidate
    : "/painel";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackURL = safeCallback(params.next);
  const configuration = getAuthConfiguration();

  if (configuration.configured && (await getCurrentSession())) {
    redirect(callbackURL);
  }

  return (
    <>
      <main className={styles.page} id="main-content">
        <section className={styles.story} aria-label="Área do candidato">
        <Link className={styles.brand} href="/" aria-label="Minha OAB — início">
          <strong>Minha</strong> OAB
        </Link>

        <div className={styles.storyCopy}>
          <p className={styles.storyEyebrow}>
            <i aria-hidden="true" />
            ÁREA DO CANDIDATO
          </p>
          <h1>
            Seu estudo <em>segue daqui.</em>
          </h1>
          <p className={styles.storyDescription}>
            Entre para retomar tentativas, respostas e resultados salvos na sua
            conta.
          </p>
        </div>

        <figure className={styles.justice} aria-hidden="true">
          <span className={styles.justiceHalo} />
          <Image
            alt=""
            className={styles.justiceImage}
            draggable={false}
            height={1536}
            priority
            sizes="(max-width: 600px) 230px, (max-width: 960px) 300px, 36vw"
            src="/images/lady-justice-login-v2.png"
            width={1024}
          />
        </figure>

        <footer className={styles.storyFooter}>
          <span>
            <i aria-hidden="true" />
            PROGRESSO SALVO
          </span>
        </footer>
        </section>

        <section className={styles.signInPanel}>
        <div className={styles.panelContent}>
          <div className={styles.card}>
            <div className={styles.cardMeta}>
              <p>ACESSO À PLATAFORMA</p>
              <span>
                <i aria-hidden="true" />
                CONEXÃO SEGURA
              </span>
            </div>

            <h2>Entre para continuar</h2>
            <p className={styles.description}>
              Use sua conta Google para acessar a plataforma. Você não precisa
              criar nem lembrar outra senha.
            </p>

            <GoogleSignInButton
              callbackURL={callbackURL}
              disabled={!configuration.configured}
              size="large"
            />

            {!configuration.configured && (
              <div className={styles.setupNotice} role="status">
                <strong>Login ainda não configurado</strong>
                <p>
                  As credenciais do Google e do banco precisam ser adicionadas
                  ao ambiente antes do primeiro acesso.
                </p>
                {process.env.NODE_ENV !== "production" && (
                  <small>
                    Pendentes:{" "}
                    {configuration.issues
                      .map((issue) => issue.variable)
                      .join(", ")}
                  </small>
                )}
              </div>
            )}

            <section
              className={styles.freeAccess}
              aria-labelledby="free-access-title"
            >
              <div className={styles.freeAccessMeta}>
                <span>ACESSO GRATUITO</span>
                <small>
                  <i aria-hidden="true" />
                  DISPONÍVEL
                </small>
              </div>
              <h3 id="free-access-title">
                Seu primeiro simulado já está incluído.
              </h3>
              <p>
                Resolva no seu ritmo, confira os acertos e continue de onde
                parou.
              </p>
              <Link href="/planos">
                Conhecer os planos <span aria-hidden="true">→</span>
              </Link>
            </section>

            <p className={styles.dataNote}>
              O acesso usa seu nome, e-mail e foto do perfil Google para
              identificar sua conta.
            </p>
          </div>

          <Link className={styles.back} href="/">
            <span aria-hidden="true">←</span> Voltar ao início
          </Link>
        </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
