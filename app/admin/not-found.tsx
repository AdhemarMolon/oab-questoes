import Link from "next/link";

export default function AdminNotFoundPage() {
  return (
    <section
      style={{
        margin: "40px auto",
        maxWidth: "720px",
        padding: "45px",
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
        ADMINISTRAÇÃO
      </p>
      <h1
        style={{
          font: "600 42px/1 var(--font-serif)",
          margin: "12px 0",
        }}
      >
        Página não encontrada.
      </h1>
      <Link
        href="/admin"
        style={{
          color: "var(--brand)",
          fontSize: "11px",
          fontWeight: 800,
        }}
      >
        Voltar à visão geral →
      </Link>
    </section>
  );
}
