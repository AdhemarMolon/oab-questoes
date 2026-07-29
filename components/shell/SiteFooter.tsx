import Link from "next/link";

import styles from "./SiteFooter.module.css";

const navigation = [
  { href: "/", label: "Início" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/estatisticas", label: "Estatísticas" },
  { href: "/planos", label: "Planos" },
] as const;

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.primary}>
          <div className={styles.identity}>
            <Link aria-label="Minha OAB — início" className={styles.brand} href="/">
              <strong>Minha</strong>
              <span>OAB</span>
            </Link>
            <p>Preparação clara e organizada para a 1ª fase.</p>
          </div>

          <nav aria-label="Navegação do rodapé" className={styles.navigation}>
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <Link className={styles.accessLink} href="/entrar">
            Área do candidato <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={styles.secondary}>
          <span>© {new Date().getFullYear()} Minha OAB</span>
          <nav aria-label="Informações legais" className={styles.legalNavigation}>
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/exclusao-de-conta">Excluir conta</Link>
            <Link href="/contato">Contato</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
