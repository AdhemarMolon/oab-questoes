import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/shell";
import { SiteHeader } from "@/components/shell/SiteHeader";
import {
  APPROVAL_COMPILATION_URL,
  APPROVAL_SOURCE_URL,
  getPublicStatistics,
} from "@/lib/data/public-statistics";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estatísticas das provas da OAB",
  description:
    "Compare as edições do Exame de Ordem, veja a incidência por disciplina e consulte a taxa nacional de aprovação.",
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}%`;
}

function barWidth(value: number, maximum: number) {
  if (maximum <= 0) return "0%";
  return `${Math.max(5, Math.round((value / maximum) * 100))}%`;
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ edicao?: string | string[] }>;
}) {
  const params = await searchParams;
  const editionValue = Array.isArray(params.edicao)
    ? params.edicao[0]
    : params.edicao;
  const requestedEdition = editionValue ? Number(editionValue) : undefined;
  const statistics = await getPublicStatistics(
    Number.isInteger(requestedEdition) ? requestedEdition : undefined,
  );

  if (!statistics) {
    return (
      <main className={styles.page} id="main-content">
        <SiteHeader />
        <section className={styles.empty}>
          <h1>As estatísticas ainda estão sendo preparadas.</h1>
          <p>Publique uma prova no acervo para liberar esta página.</p>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const { selectedExam } = statistics;
  const maximumQuestionCount =
    statistics.subjectDistribution[0]?.questionCount ?? 0;
  const approvalRate = statistics.approval?.overallApprovalRate ?? 0;
  const approvalStyle = {
    "--approval-rate": `${approvalRate}%`,
  } as CSSProperties;
  const mostFrequent = statistics.mostFrequent[0] ?? null;
  const leastQuestionCount =
    statistics.leastFrequent[0]?.questionCount ?? 0;

  return (
    <main className={styles.page} id="main-content">
      <SiteHeader />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>DADOS DA PROVA · 1ª FASE</p>
          <h1>
            {selectedExam.edition}º Exame em <em>números.</em>
          </h1>
          <p className={styles.lead}>
            Veja a composição desta edição, as disciplinas com maior e menor
            incidência e o resultado nacional consolidado dos candidatos.
          </p>
        </div>

        <form action="/estatisticas" className={styles.editionFilter} method="get">
          <label htmlFor="edition">
            <span>FILTRAR ESTATÍSTICAS</span>
            <strong>Escolha uma edição</strong>
          </label>
          <div>
            <select
              defaultValue={selectedExam.edition}
              id="edition"
              name="edicao"
            >
              {statistics.editions.map((exam) => (
                <option key={exam.edition} value={exam.edition}>
                  {exam.edition}º Exame de Ordem · {exam.year}
                </option>
              ))}
            </select>
            <button type="submit">Ver edição</button>
          </div>
        </form>
      </section>

      <dl className={styles.overview} aria-label="Resumo da edição selecionada">
        <div>
          <dt>{selectedExam.totalQuestions}</dt>
          <dd>questões na prova</dd>
        </div>
        <div>
          <dt>{selectedExam.subjectCount}</dt>
          <dd>disciplinas cobradas</dd>
        </div>
        <div>
          <dt>{selectedExam.passingQuestions}</dt>
          <dd>acertos para a 2ª fase</dd>
        </div>
        <div>
          <dt>{selectedExam.annulledQuestions}</dt>
          <dd>questões anuladas no acervo</dd>
        </div>
      </dl>

      <section className={styles.approvalSection}>
        <article className={styles.approvalCard}>
          <div className={styles.sectionHeading}>
            <div>
              <p>RESULTADO NACIONAL</p>
              <h2>Taxa geral de aprovação</h2>
            </div>
            <span>EDIÇÃO {selectedExam.edition}</span>
          </div>

          <div className={styles.approvalContent}>
            <div
              aria-label={
                statistics.approval?.overallApprovalRate !== null &&
                statistics.approval
                  ? `${formatPercentage(statistics.approval.overallApprovalRate)} de aprovação geral`
                  : "Taxa geral consolidada indisponível"
              }
              className={styles.approvalRing}
              role="img"
              style={approvalStyle}
            >
              <div>
                <strong>
                  {statistics.approval?.overallApprovalRate !== null &&
                  statistics.approval
                    ? formatPercentage(
                        statistics.approval.overallApprovalRate,
                      )
                    : "—"}
                </strong>
                <span>aprovados</span>
              </div>
            </div>

            {statistics.approval ? (
              <dl className={styles.approvalMetrics}>
                <div>
                  <dt>
                    {numberFormatter.format(
                      statistics.approval.registeredFirstPhase,
                    )}
                  </dt>
                  <dd>inscritos na 1ª fase</dd>
                </div>
                <div>
                  <dt>
                    {statistics.approval.presentFirstPhase
                      ? numberFormatter.format(
                          statistics.approval.presentFirstPhase,
                        )
                      : "—"}
                  </dt>
                  <dd>presentes na 1ª fase</dd>
                </div>
                <div>
                  <dt>
                    {numberFormatter.format(
                      statistics.approval.finalApproved,
                    )}
                  </dt>
                  <dd>aprovados no resultado final</dd>
                </div>
                <div>
                  <dt>
                    {statistics.approval.reuseRegistrations
                      ? numberFormatter.format(
                          statistics.approval.reuseRegistrations,
                        )
                      : "—"}
                  </dt>
                  <dd>inscrições por reaproveitamento</dd>
                </div>
              </dl>
            ) : (
              <div className={styles.unavailable}>
                A OAB ainda não disponibilizou dados nacionais consolidados
                para esta edição.
              </div>
            )}
          </div>

          <p className={styles.contextNote}>
            {statistics.approval?.note ??
              "A taxa geral relaciona o total de aprovados ao conjunto de inscrições da edição, incluindo o reaproveitamento da 1ª fase."}
          </p>
          <div className={styles.sources}>
            <span>FONTES</span>
            <a href={APPROVAL_SOURCE_URL} rel="noreferrer" target="_blank">
              OAB · Dados estatísticos
            </a>
            <a
              href={APPROVAL_COMPILATION_URL}
              rel="noreferrer"
              target="_blank"
            >
              Consolidação nacional
            </a>
          </div>
        </article>

        <aside className={styles.proofCard}>
          <p>COMPOSIÇÃO DA OBJETIVA</p>
          <strong>
            {statistics.topFiveShare.toLocaleString("pt-BR")}%
          </strong>
          <span>da prova está concentrada nas cinco disciplinas líderes.</span>
          <div>
            <small>MAIOR PESO</small>
            <b>{mostFrequent?.subject ?? "—"}</b>
            <em>
              {mostFrequent
                ? `${mostFrequent.questionCount} questões · ${formatPercentage(mostFrequent.share)}`
                : "Sem dados"}
            </em>
          </div>
          <div>
            <small>MENOR PESO</small>
            <b>
              {statistics.leastFrequent
                .filter(
                  (subject) => subject.questionCount === leastQuestionCount,
                )
                .map((subject) => subject.subject)
                .join(", ") || "—"}
            </b>
            <em>{leastQuestionCount} questões por disciplina</em>
          </div>
        </aside>
      </section>

      <section className={styles.frequencySection}>
        <div className={styles.sectionIntro}>
          <p>INCIDÊNCIA NA EDIÇÃO {selectedExam.edition}</p>
          <h2>O que mais caiu — e o que menos caiu.</h2>
          <span>
            Os percentuais abaixo usam somente as questões do{" "}
            {selectedExam.edition}º Exame de Ordem.
          </span>
        </div>

        <div className={styles.frequencyColumns}>
          <article>
            <header>
              <span>MAIOR INCIDÊNCIA</span>
              <strong>Disciplinas mais cobradas</strong>
            </header>
            <div className={styles.frequencyList}>
              {statistics.mostFrequent.map((subject, index) => (
                <div className={styles.frequencyRow} key={subject.subject}>
                  <span className={styles.position}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p>
                      <strong>{subject.subject}</strong>
                      <span>{formatPercentage(subject.share)}</span>
                    </p>
                    <i>
                      <b
                        style={{
                          width: barWidth(
                            subject.questionCount,
                            maximumQuestionCount,
                          ),
                        }}
                      />
                    </i>
                    <small>{subject.questionCount} questões</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.lessFrequent}>
            <header>
              <span>MENOR INCIDÊNCIA</span>
              <strong>Disciplinas menos cobradas</strong>
            </header>
            <div className={styles.frequencyList}>
              {statistics.leastFrequent.map((subject, index) => (
                <div className={styles.frequencyRow} key={subject.subject}>
                  <span className={styles.position}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p>
                      <strong>{subject.subject}</strong>
                      <span>{formatPercentage(subject.share)}</span>
                    </p>
                    <i>
                      <b
                        style={{
                          width: barWidth(
                            subject.questionCount,
                            maximumQuestionCount,
                          ),
                        }}
                      />
                    </i>
                    <small>{subject.questionCount} questões</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {statistics.previousEdition ? (
        <section className={styles.changesSection}>
          <div className={styles.sectionIntro}>
            <p>COMPARAÇÃO ENTRE PROVAS</p>
            <h2>
              O que mudou desde a edição {statistics.previousEdition}.
            </h2>
            <span>
              Variação no número de questões por disciplina em relação à prova
              imediatamente anterior disponível no acervo.
            </span>
          </div>
          {statistics.editionChanges.length ? (
            <div className={styles.changesGrid}>
              {statistics.editionChanges.slice(0, 8).map((subject) => (
                <article key={subject.subject}>
                  <span
                    className={
                      subject.difference > 0
                        ? styles.increase
                        : styles.decrease
                    }
                  >
                    {subject.difference > 0 ? "+" : ""}
                    {subject.difference}
                  </span>
                  <strong>{subject.subject}</strong>
                  <small>
                    {subject.previous} → {subject.current} questões
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.noChanges}>
              A distribuição por disciplina permaneceu igual à edição anterior.
            </div>
          )}
        </section>
      ) : null}

      <section className={styles.fullRanking}>
        <div className={styles.sectionIntro}>
          <p>MAPA COMPLETO · EDIÇÃO {selectedExam.edition}</p>
          <h2>Todas as disciplinas da prova.</h2>
        </div>
        <div className={styles.rankingTable}>
          {statistics.subjectDistribution.map((subject) => (
            <div className={styles.rankingRow} key={subject.subject}>
              <span>{String(subject.rank).padStart(2, "0")}</span>
              <strong>{subject.subject}</strong>
              <i>
                <b
                  style={{
                    width: barWidth(
                      subject.questionCount,
                      maximumQuestionCount,
                    ),
                  }}
                />
              </i>
              <small>{subject.questionCount} questões</small>
              <em>{formatPercentage(subject.share)}</em>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.methodology}>
        <div>
          <p>COMO CALCULAMOS</p>
          <h2>Dados separados por edição.</h2>
        </div>
        <ul>
          <li>
            Incidência calculada exclusivamente com as questões publicadas da
            edição selecionada.
          </li>
          <li>
            Taxa de aprovação referente ao resultado nacional final, e não aos
            usuários da plataforma.
          </li>
          <li>
            Nenhuma resposta, resultado ou informação pessoal de aluno aparece
            nesta página.
          </li>
        </ul>
        <Link href="/entrar">
          Resolver um simulado <span aria-hidden="true">→</span>
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
