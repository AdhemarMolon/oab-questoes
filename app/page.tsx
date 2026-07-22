"use client";

import { useEffect, useMemo, useState } from "react";
import { questions, type Question } from "./questions-data";

const subjects = [
  "Ética Profissional", "Direito Constitucional", "Direito Civil",
  "Processo Civil", "Direito Penal", "Processo Penal",
  "Direito do Trabalho", "Processo do Trabalho", "Direito Administrativo",
  "Direito Empresarial", "Direito Tributário", "Direitos Humanos",
  "Direito Internacional", "Direito Ambiental", "ECA",
  "Direito do Consumidor", "Filosofia do Direito", "Direito Previdenciário",
  "Direito Financeiro", "Direito Eleitoral",
] as const;

const exams = [
  { id: "41", title: "41º Exame de Ordem", year: "2024", color: "Tipo 1 — Branca", source: "Caderno oficial e gabarito definitivo" },
  { id: "40", title: "40º Exame de Ordem", year: "2024", color: "Tipo 1 — Branca", source: "Caderno oficial e gabarito definitivo" },
  { id: "39", title: "39º Exame de Ordem", year: "2023", color: "Tipo 1 — Branca", source: "Caderno oficial e gabarito definitivo" },
  { id: "38", title: "38º Exame de Ordem", year: "2023", color: "Tipo 1 — Branca", source: "Caderno oficial e gabarito definitivo" },
  { id: "37", title: "37º Exame de Ordem", year: "2023", color: "Tipo 1 — Branca", source: "Caderno oficial e gabarito definitivo" },
];

export default function Home() {
  const [tab, setTab] = useState("inicio");
  const [subject, setSubject] = useState("Todas as matérias");
  const [exam, setExam] = useState("Todos os exames");
  const [status, setStatus] = useState("Todas");
  const [saved, setSaved] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [questionSaved, setQuestionSaved] = useState<string[]>([]);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [current, setCurrent] = useState<Question | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem("oab-questoes-progress");
        if (raw) {
          const data = JSON.parse(raw);
          setSaved(Array.isArray(data.saved) ? data.saved : []);
          setAnswers(data.answers && typeof data.answers === "object" ? data.answers : {});
          setQuestionSaved(Array.isArray(data.questionSaved) ? data.questionSaved : []);
        }
      } finally {
        setProgressLoaded(true);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!progressLoaded) return;
    localStorage.setItem("oab-questoes-progress", JSON.stringify({ saved, answers, questionSaved }));
  }, [saved, answers, questionSaved, progressLoaded]);

  const filtered = useMemo(() => exams.filter((item) => exam === "Todos os exames" || item.id === exam), [exam]);
  const filteredQuestions = useMemo(() => questions.filter((q) => {
    if (subject !== "Todas as matérias" && q.subject !== subject) return false;
    if (exam !== "Todos os exames" && String(q.exam) !== exam) return false;
    if (status === "Respondidas" && !answers[q.id]) return false;
    if (status === "Não respondidas" && answers[q.id]) return false;
    if (status === "Favoritas" && !questionSaved.includes(q.id)) return false;
    return true;
  }), [subject, exam, status, answers, questionSaved]);
  const answered = Object.keys(answers).length;
  const correct = questions.filter((q) => answers[q.id] && answers[q.id] === q.answer).length;

  function openQuestion(question: Question) {
    setCurrent(question); setChoice(answers[question.id] ?? null); setRevealed(Boolean(answers[question.id]));
  }

  function startSession(random = false, onlyExam?: number) {
    const pool = onlyExam ? questions.filter((q) => q.exam === onlyExam) : filteredQuestions;
    if (!pool.length) return;
    openQuestion(pool[random ? Math.floor(Math.random() * pool.length) : 0]);
  }

  function submitAnswer() {
    if (!current || !choice) return;
    setAnswers((all) => ({ ...all, [current.id]: choice })); setRevealed(true);
  }

  function move(delta: number) {
    if (!current) return;
    const pool = filteredQuestions.length ? filteredQuestions : questions;
    const index = pool.findIndex((q) => q.id === current.id);
    openQuestion(pool[(index + delta + pool.length) % pool.length]);
  }

  function go(next: string) {
    setTab(next);
    requestAnimationFrame(() => document.getElementById(next)?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => go("inicio")} aria-label="Ir para o início"><span>OAB</span> Questões</button>
        <nav aria-label="Navegação principal">
          {["inicio", "questoes", "materias", "desempenho"].map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => go(item)}>{item === "questoes" ? "Questões" : item[0].toUpperCase() + item.slice(1)}</button>
          ))}
        </nav>
        <button className="account" onClick={() => go("desempenho")}><span className="avatar">A</span> Meu progresso</button>
      </header>

      <section id="inicio" className="hero">
        <div className="margin-note">CONTEÚDO OFICIAL DA OAB <i /> FOCO NO QUE CAI</div>
        <div className="hero-copy">
          <p className="eyebrow">PREPARAÇÃO COM PROVAS REAIS</p>
          <div className="ornament">✦</div>
          <h1>Estude com questões oficiais de provas anteriores da <em>OAB.</em></h1>
          <p className="lead">Uma plataforma organizada por matéria, exame e desempenho. <strong>Nada inventado.</strong></p>
          <div className="actions">
            <button className="primary" onClick={() => go("questoes")}><span>▤</span> Começar a resolver</button>
            <button className="text-button" onClick={() => go("materias")}>Explorar matérias <b>→</b></button>
          </div>
          <div className="official-slip">
            <div><strong>20</strong><span>matérias</span></div><i />
            <div><strong>41º</strong><span>exame mais recente do acervo inicial</span></div>
            <div className="stamp">BASE<br /><b>OFICIAL</b></div>
          </div>
        </div>

        <div className="paper-stack" aria-label="Visão geral do acervo">
          <div className="paper progress-paper">
            <div className="paper-head"><span>SEU PROGRESSO POR MATÉRIA</span><button onClick={() => go("materias")}>Ver todas →</button></div>
            {subjects.slice(0, 3).map((name, index) => {
              const total = questions.filter((q) => q.subject === name).length;
              const value = questions.filter((q) => q.subject === name && answers[q.id]).length;
              return <button className="progress-row" key={name} onClick={() => { setSubject(name); go("questoes"); }}>
                <span className="subject-icon">{index === 0 ? "§" : index === 1 ? "⌂" : "▤"}</span>
                <span><b>{name}</b><small>{value} questões resolvidas</small></span>
                <span className="bar"><i style={{ width: `${Math.round(value / total * 100)}%` }} /></span>
                <strong>{Math.round(value / total * 100)}%</strong><b>›</b>
              </button>;
            })}
          </div>
          <div className="paper feature-paper">
            <div className="question-label"><span>QUESTÕES DE PROVAS ANTERIORES — OAB</span><b>FONTE IDENTIFICADA</b></div>
            <div className="feature-body">
              <div className="big-number">23.</div>
              <div>
                <h2>Cada questão conserva sua identificação de origem.</h2>
                <p>Exame, ano, número da questão, matéria, tipo de caderno e referência ao gabarito ficam sempre visíveis.</p>
                <ul><li>Texto sem adaptações</li><li>Alternativas na ordem original</li><li>Correção pelo gabarito definitivo</li></ul>
              </div>
            </div>
            <div className="source-line"><span>▧ Verificação documental</span><button onClick={() => go("questoes")}>Abrir acervo →</button></div>
          </div>
          <div className="paper-stats"><span><b>400</b> questões oficiais</span><span><b>5</b> exames completos</span><span><b>100%</b> rastreável</span></div>
        </div>
      </section>

      <section id="questoes" className="section questions-section">
        <div className="section-title"><p>ACERVO ORGANIZADO</p><h2>Encontre a prova que você precisa.</h2><span>Filtre por matéria, exame e situação de estudo.</span></div>
        <div className="filters">
          <label>Matéria<select value={subject} onChange={(e) => setSubject(e.target.value)}><option>Todas as matérias</option>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Exame<select value={exam} onChange={(e) => setExam(e.target.value)}><option>Todos os exames</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
          <label>Situação<select value={status} onChange={(e) => setStatus(e.target.value)}><option>Todas</option><option>Não respondidas</option><option>Respondidas</option><option>Favoritas</option></select></label>
          <button className="shuffle" onClick={() => startSession(true)}>↝ Sessão aleatória ({filteredQuestions.length})</button>
        </div>
        <div className="exam-grid">
          {filtered.map((item) => <article className="exam-card" key={item.id}>
            <div className="exam-index">{item.id}</div>
            <p>{item.year} · 1ª FASE</p><h3>{item.title}</h3><span>{item.color}</span>
            <div className="card-meta"><span>80 questões</span><span>{item.source}</span></div>
            <div className="card-actions"><button onClick={() => startSession(false, Number(item.id))}>Resolver a prova</button><button aria-label="Favoritar prova" className={saved.includes(item.id) ? "saved" : ""} onClick={() => setSaved((all) => all.includes(item.id) ? all.filter((id) => id !== item.id) : [...all, item.id])}>☆</button></div>
          </article>)}
        </div>
        <div className="integrity-note"><b>400 questões disponíveis</b><p>Questões dos exames 37º ao 41º, extraídas dos cadernos Tipo 1 - Branca e corrigidas pelos gabaritos oficiais enviados.</p><button className="text-button" onClick={() => startSession(false)}>Resolver filtradas →</button></div>
      </section>

      <section id="materias" className="section subjects-section">
        <div className="section-title"><p>20 MATÉRIAS DA 1ª FASE</p><h2>Estude por disciplina.</h2><span>A quantidade indica o total disponível no acervo atual.</span></div>
        <div className="subject-grid">{subjects.map((name, i) => <button key={name} onClick={() => { setSubject(name); go("questoes"); }}><span>{String(i + 1).padStart(2, "0")}</span><b>{name}</b><small>{questions.filter((q) => q.subject === name).length} questões oficiais</small><i>→</i></button>)}</div>
      </section>

      <section id="desempenho" className="section dashboard-section">
        <div className="section-title light"><p>SEU CADERNO DE ESTUDOS</p><h2>Progresso salvo neste dispositivo.</h2><span>Continue de onde parou e acompanhe a construção da sua rotina.</span></div>
        <div className="dashboard">
          <div className="score"><span>QUESTÕES RESOLVIDAS</span><strong>{answered}</strong><small>{correct} acertos · {answered ? Math.round(correct/answered*100) : 0}% de aproveitamento</small><div><i style={{ width: `${Math.min(100, answered / 4)}%` }} /></div></div>
          <div className="dash-card"><span>PROVAS FAVORITAS</span><strong>{saved.length}</strong><p>{saved.length ? `Exames ${saved.join(", ")}` : "Marque uma prova para encontrá-la rapidamente."}</p></div>
          <div className="dash-card"><span>MATÉRIA SELECIONADA</span><strong className="subject-name">{subject}</strong><p>Use os filtros para montar sua próxima sessão.</p></div>
        </div>
      </section>

      {current && <div className="question-overlay" role="dialog" aria-modal="true" aria-label={`Questão ${current.number} do ${current.exam}º Exame`}>
        <article className="question-sheet">
          <div className="question-top"><div><span>{current.subject}</span><b>{current.exam}º EXAME · 202{current.year - 2020} · TIPO 1 BRANCA</b></div><button onClick={() => setCurrent(null)} aria-label="Fechar questão">×</button></div>
          <div className="question-source">QUESTÃO OFICIAL <i /> Nº {current.number} <i /> {current.annulled ? "ANULADA" : "GABARITO DEFINITIVO"}</div>
          <div className="question-content"><div className="modal-number">{current.number}.</div><div><p className="stem">{current.text}</p>
            <div className="options">{Object.entries(current.options).map(([letter,text]) => {
              const selected = choice === letter; const right = revealed && current.answer === letter; const wrong = revealed && selected && current.answer !== letter;
              return <button key={letter} disabled={revealed || current.annulled} className={`${selected ? "selected" : ""} ${right ? "right" : ""} ${wrong ? "wrong" : ""}`} onClick={() => setChoice(letter)}><b>{letter}</b><span>{text}</span></button>;
            })}</div>
          </div></div>
          {current.annulled && <div className="result annulled">Questão anulada no gabarito definitivo.</div>}
          {revealed && !current.annulled && <div className={`result ${choice === current.answer ? "correct" : "incorrect"}`}>{choice === current.answer ? "Resposta correta." : `Resposta incorreta. Gabarito: ${current.answer}.`}</div>}
          <div className="question-footer"><button className={`favorite-question ${questionSaved.includes(current.id) ? "saved" : ""}`} onClick={() => setQuestionSaved((all) => all.includes(current.id) ? all.filter((id) => id !== current.id) : [...all,current.id])}>☆ Favoritar</button><span>{filteredQuestions.findIndex((q) => q.id === current.id)+1 || 1} de {filteredQuestions.length || questions.length}</span><div><button onClick={() => move(-1)}>← Anterior</button>{!revealed && !current.annulled ? <button className="submit" disabled={!choice} onClick={submitAnswer}>Responder</button> : <button className="submit" onClick={() => move(1)}>Próxima →</button>}</div></div>
        </article>
      </div>}

      <footer><div className="brand"><span>OAB</span> Questões</div><p>Questões anteriores organizadas para estudo. A OAB e a FGV não mantêm vínculo com esta plataforma.</p><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Voltar ao topo ↑</button></footer>
    </main>
  );
}
