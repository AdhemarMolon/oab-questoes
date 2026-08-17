"use client";

import { useActionState } from "react";

import type { BillingPlanCode } from "@/lib/billing/config";

import { startCheckoutAction } from "./actions";
import styles from "./page.module.css";

const initialCheckoutActionState: Awaited<
  ReturnType<typeof startCheckoutAction>
> = {
  error: null,
};

export function CheckoutButton({
  configured,
  plan,
}: {
  configured: boolean;
  plan: BillingPlanCode;
}) {
  const [state, action, pending] = useActionState(
    startCheckoutAction,
    initialCheckoutActionState,
  );

  return (
    <form action={action} className={styles.checkoutForm}>
      <input name="plan" type="hidden" value={plan} />
      <button
        className={styles.cardAction}
        disabled={!configured || pending}
        type="submit"
      >
        {pending
          ? "Abrindo pagamento…"
          : configured
            ? "Pagar com PIX"
            : "Disponível em breve"}
      </button>
      {state.error ? (
        <p className={styles.checkoutError} role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
