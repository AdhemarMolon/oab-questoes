import type { Metadata } from "next";

import { PanelPageHeader, StatCard, TrendChart } from "@/components/panel";
import { getStudyAnalytics } from "@/lib/data/study";
import { requireUser } from "@/lib/session";

import styles from "../study.module.css";

export const metadata: Metadata = { title: "Meta dos 40 Pontos" };

export default async function Goal40Page() {
  const session = await requireUser();
  const data = await getStudyAnalytics(session.user.id);
  const recent = data.simulationHistory.slice(-5);
  const estimated = recent.length ? Math.round(recent.reduce((sum, item) => sum + (item.score / item.total) * 80, 0) / recent.length) : Math.round((data.summary.accuracy / 100) * 80);
  const distance = Math.max(0, 40 - estimated);
  const best = data.simulationHistory.length ? Math.round(Math.max(...data.simulationHistory.map((item) => (item.score / item.total) * 80))) : 0;
  return <main className={styles.page} id="main-content">
    <PanelPageHeader eyebrow="PRIMEIRA FASE" title="Meta dos 40 Pontos" description="Estimativa normalizada para uma prova de 80 questões, baseada nos seus resultados mais recentes."/>
    <section className={styles.stats}>
      <StatCard label="Desempenho estimado" tone="brand" value={`${estimated} / 80`} detail={distance ? `Faltam aproximadamente ${distance} pontos` : "Faixa de aprovação atingida"}/>
      <StatCard label="Distância dos 40" value={distance} detail="Pontos estimados"/>
      <StatCard label="Melhor resultado" value={`${best} / 80`} detail="Resultado normalizado"/>
      <StatCard label="Média recente" tone="gold" value={`${estimated} pts`} detail={`Base: ${recent.length || "histórico geral"}`}/>
    </section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>FAIXA DE APROVAÇÃO</p><h2>{distance ? `Você está a cerca de ${distance} pontos da meta.` : "Você alcançou a faixa estimada de aprovação."}</h2></div></div><div className={styles.scoreTrack}><div><b style={{ width: `${Math.min(100, (estimated / 80) * 100)}%` }}/></div><div className={styles.scoreLabels}><span>0 pontos</span><strong>40 · referência</strong><span>80 pontos</span></div></div><p className={styles.notice}>Esta é uma estimativa de acompanhamento, não uma garantia de aprovação. Resultados de simulados com tamanhos diferentes são normalizados para 80 questões.</p></section>
    <section className={styles.panel} style={{ marginTop: 14 }}><div className={styles.panelHeader}><div><p className={styles.sectionEyebrow}>EVOLUÇÃO</p><h2>Pontuação normalizada</h2></div></div>{data.simulationHistory.length ? <TrendChart items={data.simulationHistory.slice(-10).map((item) => ({ label: `${Math.round((item.score / item.total) * 80)} pts`, value: Math.round((item.score / item.total) * 100) }))}/> : <p className={styles.notice}>Conclua simulados para acompanhar a evolução até os 40 pontos.</p>}</section>
  </main>;
}
