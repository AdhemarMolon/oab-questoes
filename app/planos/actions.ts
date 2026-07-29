"use server";

import { redirect } from "next/navigation";

import { createCheckoutForUser } from "@/lib/billing/checkout";
import {
  BillingConfigurationError,
  isBillingPlanCode,
} from "@/lib/billing/config";
import { AuthAccessError, requireUser } from "@/lib/session";

export type CheckoutActionState = {
  error: string | null;
};

export const initialCheckoutActionState: CheckoutActionState = {
  error: null,
};

export async function startCheckoutAction(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const rawPlan = formData.get("plan");

  if (!isBillingPlanCode(rawPlan)) {
    return { error: "Escolha um plano válido." };
  }

  let session;
  try {
    session = await requireUser();
  } catch (error) {
    if (
      error instanceof AuthAccessError &&
      error.code === "AUTHENTICATION_REQUIRED"
    ) {
      redirect("/entrar?next=/planos");
    }
    throw error;
  }

  let checkoutUrl: string;
  try {
    checkoutUrl = await createCheckoutForUser(session.user.id, rawPlan);
  } catch (error) {
    if (error instanceof BillingConfigurationError) {
      return { error: error.message };
    }

    console.error("Failed to create AbacatePay checkout", error);
    return {
      error:
        "Não foi possível abrir o pagamento agora. Tente novamente em alguns instantes.",
    };
  }

  redirect(checkoutUrl);
}
