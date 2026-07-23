import type { Metadata } from "next";

import { Badge } from "@/components/ui";
import { listAnnouncements } from "@/lib/data/admin";

import { archiveAnnouncementAction, saveAnnouncementAction } from "../actions";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Comunicados — Admin" };

function localDateTime(date: Date | null) {
  if (!date) return "";
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function audienceValue(value: "ALL" | "FREE" | "FULL_ACCESS") {
  return value === "FULL_ACCESS" ? "paid" : value.toLowerCase();
}

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const [items, messages] = await Promise.all([listAnnouncements(), searchParams]);
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div><p>COMUNICADOS GLOBAIS</p><h1>Mensagens da plataforma</h1><span>Crie como rascunho e publique para todos ou para um segmento.</span></div>
      </header>
      {messages.sucesso && <div className={`${styles.notice} ${styles.successNotice}`}>{messages.sucesso}</div>}
      {messages.erro && <div className={`${styles.notice} ${styles.errorNotice}`}>{messages.erro}</div>}

      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Novo comunicado</h2><p>Texto simples, janela de publicação e audiência definida.</p></div></div>
          <form action={saveAnnouncementAction} className={styles.formGrid}>
            <label className={`${styles.formField} ${styles.fullField}`}>Título<input maxLength={120} name="title" required /></label>
            <label className={`${styles.formField} ${styles.fullField}`}>Mensagem<textarea maxLength={4000} name="body" required /></label>
            <label className={styles.formField}>Status<select defaultValue="draft" name="status"><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
            <label className={styles.formField}>Audiência<select defaultValue="all" name="audience"><option value="all">Todos</option><option value="free">Gratuitos</option><option value="paid">Acesso completo</option></select></label>
            <label className={styles.formField}>Início<input name="startsAt" type="datetime-local" /></label>
            <label className={styles.formField}>Término<input name="endsAt" type="datetime-local" /></label>
            <label className={`${styles.checkRow} ${styles.fullField}`}><input defaultChecked name="dismissible" type="checkbox" /> Usuário pode dispensar</label>
            <div className={styles.fullField}><button className={styles.actionButton} type="submit">Salvar comunicado</button></div>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Comunicados existentes</h2><p>{items.length} registro(s), incluindo rascunhos e arquivados.</p></div></div>
          <div className={styles.cardList}>
            {items.map((item) => (
              <details className={styles.listCard} key={item.id}>
                <summary className={styles.listCardTop}>
                  <div><strong>{item.title}</strong><p>{item.body.slice(0, 100)}{item.body.length > 100 ? "…" : ""}</p></div>
                  <div><Badge variant={item.status === "PUBLISHED" ? "success" : item.status === "ARCHIVED" ? "neutral" : "warning"}>{item.status}</Badge></div>
                </summary>
                <form action={saveAnnouncementAction} className={styles.formGrid} style={{ marginTop: 18 }}>
                  <input name="id" type="hidden" value={item.id} />
                  <label className={`${styles.formField} ${styles.fullField}`}>Título<input defaultValue={item.title} name="title" required /></label>
                  <label className={`${styles.formField} ${styles.fullField}`}>Mensagem<textarea defaultValue={item.body} name="body" required /></label>
                  <label className={styles.formField}>Status<select defaultValue={item.status.toLowerCase()} name="status"><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
                  <label className={styles.formField}>Audiência<select defaultValue={audienceValue(item.audience)} name="audience"><option value="all">Todos</option><option value="free">Gratuitos</option><option value="paid">Acesso completo</option></select></label>
                  <label className={styles.formField}>Início<input defaultValue={localDateTime(item.startsAt)} name="startsAt" type="datetime-local" /></label>
                  <label className={styles.formField}>Término<input defaultValue={localDateTime(item.endsAt)} name="endsAt" type="datetime-local" /></label>
                  <label className={`${styles.checkRow} ${styles.fullField}`}><input defaultChecked={item.dismissible} name="dismissible" type="checkbox" /> Usuário pode dispensar</label>
                  <div className={`${styles.inlineActions} ${styles.fullField}`}><button className={styles.actionButton} type="submit">Atualizar</button></div>
                </form>
                {item.status !== "ARCHIVED" && <form action={archiveAnnouncementAction} className={styles.inlineActions}><input name="id" type="hidden" value={item.id} /><button className={styles.dangerButton} type="submit">Arquivar</button></form>}
              </details>
            ))}
            {!items.length && <div className={styles.empty}><p>Nenhum comunicado criado.</p></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
