import { redirect } from "next/navigation";
import Link from "next/link";

import { AnnouncementBanner, PlatformHeader } from "@/components/shell";
import { getUserAccess } from "@/lib/data/access";
import { getVisibleAnnouncement } from "@/lib/data/announcements";
import { AuthConfigurationError } from "@/lib/auth";
import { AuthAccessError, requireUser } from "@/lib/session";

import styles from "./platform.module.css";

export const dynamic = "force-dynamic";

async function loadPlatformContext() {
  try {
    const session = await requireUser();
    const access = await getUserAccess(session.user.id);
    const announcement = await getVisibleAnnouncement(session.user.id, access);
    return { session, access, announcement, setupRequired: false as const };
  } catch (error) {
    if (error instanceof AuthAccessError && error.code === "AUTHENTICATION_REQUIRED") {
      redirect("/entrar?next=/painel");
    }

    if (error instanceof AuthConfigurationError) {
      return { setupRequired: true as const, issues: error.issues };
    }

    throw error;
  }
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const context = await loadPlatformContext();

  if (context.setupRequired) {
    return (
      <main className={styles.setupPage}>
        <section>
          <p>CONFIGURAÇÃO DO MVP</p>
          <h1>A plataforma está pronta para receber as credenciais.</h1>
          <span>
            Configure o Neon e o Google OAuth no arquivo de ambiente para liberar as rotas autenticadas.
          </span>
          {process.env.NODE_ENV !== "production" && (
            <code>{context.issues.map((issue) => issue.variable).join(" · ")}</code>
          )}
          <Link href="/">Voltar ao início</Link>
        </section>
      </main>
    );
  }

  const role = context.session.user.role === "admin" ? "admin" : "user";

  return (
    <div className={styles.platform}>
      <PlatformHeader
        user={{
          name: context.session.user.name,
          email: context.session.user.email,
          role,
        }}
      />
      {context.announcement && (
        <div className={styles.announcement}>
          <AnnouncementBanner title={context.announcement.title} tone="info">
            {context.announcement.body}
          </AnnouncementBanner>
        </div>
      )}
      {children}
    </div>
  );
}
