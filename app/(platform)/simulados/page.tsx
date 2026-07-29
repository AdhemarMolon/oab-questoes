import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui";
import { getUserAccess } from "@/lib/data/access";
import { listAvailableSimulations } from "@/lib/data/simulations";
import { requireUser } from "@/lib/session";

import {
  resumeSimulationAttemptAction,
  startSimulationAction,
} from "./actions";
import { RepeatSimulationForm } from "./RepeatSimulationForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Simulados" };

type SimulationsPageProps = {
  searchParams: Promise<{ erro?: string | string[] }>;
};

function displayError(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text) return null;
  if (text === "simulado-invalido") {
    return "O simulado selecionado é inválido.";
  }
  return text.slice(0, 180);
}

export default async function SimulationsPage({
  searchParams,
}: SimulationsPageProps) {
  const [session, params] = await Promise.all([requireUser(), searchParams]);
  const access = await getUserAccess(session.user.id);
  const catalog = await listAvailableSimulations(session.user.id, access);
  const error = displayError(params.erro);

  return (
    <main className={styles.page} id="main-content">
      <header className={styles.intro}>
        <div>
          <p>ÁREA DE SIMULADOS</p>
          <h1>Treine em condições consistentes.</h1>
          <span>
            Cada tentativa preserva as questões e a ordem do início ao resultado.
          </span>
        </div>
        <Badge variant={access.hasFullAccess ? "premium" : "neutral"} withDot>
          {access.hasFullAccess ? "Acesso completo" : "Plano gratuito"}
        </Badge>
      </header>

      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}

      {!access.hasFullAccess ? (
        <section className={styles.allowance}>
          <div>
            <span>SEU BENEFÍCIO GRATUITO</span>
            <strong>
              {catalog.freeAttempt
                ? "Simulado gratuito liberado"
                : "1 simulado disponível"}
            </strong>
          </div>
          <p>
            {catalog.freeAttempt
              ? "Você pode retomar, consultar o resultado ou refazer o mesmo simulado."
              : "Ao iniciar, esta tentativa ficará vinculada à sua conta e poderá ser retomada depois."}
          </p>
          {catalog.freeAttempt ? (
            catalog.freeAttempt.pausedAt ? (
              <form
                action={resumeSimulationAttemptAction}
                className={styles.resumeForm}
              >
                <input
                  name="attemptId"
                  type="hidden"
                  value={catalog.freeAttempt.id}
                />
                <button type="submit">Retomar tentativa →</button>
              </form>
            ) : (
              <Link
                href={`/simulados/${catalog.freeAttempt.id}${
                  catalog.freeAttempt.status === "SUBMITTED" ? "/resultado" : ""
                }`}
              >
                {catalog.freeAttempt.status === "SUBMITTED"
                  ? "Ver resultado →"
                  : "Continuar tentativa →"}
              </Link>
            )
          ) : null}
        </section>
      ) : null}

      <section className={styles.grid} aria-label="Catálogo de simulados">
        {catalog.simulations.map((simulation, index) => {
          const latest = simulation.latestAttempt;
          const canContinue = latest?.status === "IN_PROGRESS";
          const canViewResult = latest?.status === "SUBMITTED";
          const canStart =
            simulation.available &&
            (!latest || latest.status === "ABANDONED");

          return (
            <article
              className={!simulation.available ? styles.locked : ""}
              key={simulation.id}
            >
              <div className={styles.cardIndex}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className={styles.cardTop}>
                <Badge
                  variant={
                    simulation.access === "FREE" ? "success" : "premium"
                  }
                >
                  {simulation.access === "FREE" ? "Gratuito" : "Completo"}
                </Badge>
                <span>
                  {simulation.durationMinutes
                    ? `${simulation.durationMinutes} min`
                    : "Sem cronômetro"}
                </span>
              </div>
              <h2>{simulation.title}</h2>
              <p>
                {simulation.description ??
                  "Simulado organizado para acompanhar seu desempenho."}
              </p>

              <div className={styles.cardActions}>
                {canContinue || canViewResult ? (
                  latest.pausedAt ? (
                    <form action={resumeSimulationAttemptAction}>
                      <input
                        name="attemptId"
                        type="hidden"
                        value={latest.id}
                      />
                      <button type="submit">Retomar simulado</button>
                    </form>
                  ) : (
                    <Link
                      href={`/simulados/${latest.id}${
                        canViewResult ? "/resultado" : ""
                      }`}
                    >
                      {canViewResult
                        ? "Ver último resultado"
                        : "Continuar simulado"}
                    </Link>
                  )
                ) : null}

                {simulation.available && canViewResult ? (
                  <RepeatSimulationForm
                    clientRequestId={crypto.randomUUID()}
                    simulationId={simulation.id}
                    simulationTitle={simulation.title}
                  />
                ) : canStart ? (
                  <form action={startSimulationAction}>
                    <input
                      name="simulationId"
                      type="hidden"
                      value={simulation.id}
                    />
                    <input
                      name="clientRequestId"
                      type="hidden"
                      value={crypto.randomUUID()}
                    />
                    <button type="submit">Iniciar simulado →</button>
                  </form>
                ) : !simulation.available ? (
                  <Link className={styles.upgrade} href="/planos">
                    Liberar acesso →
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {!catalog.simulations.length ? (
        <section className={styles.empty}>
          <h2>Nenhum simulado foi publicado ainda.</h2>
          <p>
            Execute o seed inicial ou publique um simulado pela área
            administrativa.
          </p>
        </section>
      ) : null}
    </main>
  );
}
