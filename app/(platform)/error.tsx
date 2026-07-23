"use client";

import styles from "./status.module.css";

export default function PlatformError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={styles.status}>
      <p className={styles.label}>NÃO FOI POSSÍVEL CARREGAR</p>
      <h1>Encontramos um problema ao acessar seus dados.</h1>
      <span>Confira a conexão com o banco e tente novamente.</span>
      <button onClick={reset} type="button">Tentar novamente</button>
    </main>
  );
}
