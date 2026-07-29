import type { ReactNode } from "react";

import { SiteFooter } from "@/components/shell";
import { SiteHeader } from "@/components/shell/SiteHeader";

import styles from "./LegalPageShell.module.css";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt?: string;
  children: ReactNode;
};

export function LegalPageShell({
  children,
  description,
  eyebrow,
  title,
  updatedAt,
}: LegalPageShellProps) {
  return (
    <main className={styles.page} id="main-content">
      <SiteHeader />
      <header className={styles.hero}>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
        {updatedAt ? <small>Última atualização: {updatedAt}</small> : null}
      </header>
      <article className={styles.document}>{children}</article>
      <SiteFooter />
    </main>
  );
}

export { styles as legalPageStyles };
