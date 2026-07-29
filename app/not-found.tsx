import Link from "next/link";

import { SiteFooter } from "@/components/shell";
import { SiteHeader } from "@/components/shell/SiteHeader";

export default function NotFoundPage() {
  return (
    <main id="main-content">
      <SiteHeader />
      <section
        style={{
          margin: "0 auto",
          maxWidth: "760px",
          minHeight: "62dvh",
          padding: "clamp(70px, 10vw, 130px) 18px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "var(--brand)",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: ".18em",
          }}
        >
          PÁGINA NÃO ENCONTRADA
        </p>
        <h1
          style={{
            font: "600 clamp(45px, 7vw, 70px)/1 var(--font-serif)",
            letterSpacing: "-.045em",
            margin: "14px 0",
          }}
        >
          Este endereço não existe.
        </h1>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Volte ao início ou use o menu para continuar navegando.
        </p>
        <Link
          href="/"
          style={{
            background: "var(--brand)",
            color: "white",
            display: "inline-flex",
            fontSize: "10px",
            fontWeight: 800,
            marginTop: "22px",
            padding: "14px 18px",
          }}
        >
          Voltar ao início
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
