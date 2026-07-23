import styles from "./status.module.css";

export default function PlatformLoading() {
  return (
    <main className={styles.status} aria-busy="true" aria-live="polite">
      <div className={styles.loader} aria-hidden="true" />
      <p>Carregando seu progresso…</p>
    </main>
  );
}
