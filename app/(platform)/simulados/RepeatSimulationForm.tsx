"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal, useFormStatus } from "react-dom";

import { startSimulationAction } from "./actions";
import styles from "./RepeatSimulationForm.module.css";

type RepeatSimulationFormProps = {
  clientRequestId: string;
  simulationId: string;
  simulationTitle: string;
};

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className={styles.confirmAction}
      disabled={pending}
      type="submit"
    >
      {pending ? "Iniciando..." : "Sim, refazer simulado"}
    </button>
  );
}

export function RepeatSimulationForm({
  clientRequestId,
  simulationId,
  simulationTitle,
}: RepeatSimulationFormProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      dialogRef.current?.focus();
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <div className={styles.repeat}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        Refazer simulado <span aria-hidden="true">→</span>
      </button>

      {open
        ? createPortal(
            <div
              className={styles.backdrop}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) setOpen(false);
              }}
            >
              <div
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                aria-modal="true"
                className={styles.dialog}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                }}
                ref={dialogRef}
                role="dialog"
                tabIndex={-1}
              >
                <span className={styles.eyebrow}>NOVA TENTATIVA</span>
                <h2 id={titleId}>Deseja sobrepor o último resultado?</h2>
                <p id={descriptionId}>
                  Ao concluir uma nova tentativa de{" "}
                  <strong>{simulationTitle}</strong>, ela passará a ser o
                  resultado exibido para este simulado.
                </p>

                <div className={styles.info}>
                  <span aria-hidden="true">✓</span>
                  <p>
                    Suas respostas anteriores continuarão contando nas
                    estatísticas gerais de questões.
                  </p>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.cancelAction}
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <form action={startSimulationAction}>
                    <input
                      name="simulationId"
                      type="hidden"
                      value={simulationId}
                    />
                    <input
                      name="clientRequestId"
                      type="hidden"
                      value={clientRequestId}
                    />
                    <input
                      name="replacePreviousResult"
                      type="hidden"
                      value="true"
                    />
                    <ConfirmButton />
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
