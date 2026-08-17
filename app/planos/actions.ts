"use server";

import { redirect } from "next/navigation";

import { AbacatePayApiError } from "@/lib/billing/abacatepay";
import { createCheckoutForUser } from "@/lib/billing/checkout";
import {
  BillingConfigurationError,
  isBillingPlanCode,
} from "@/lib/billing/config";
import { AuthAccessError, requireUser } from "@/lib/session";

type CheckoutActionState = {
  error: string | null;
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

    if (
      error instanceof AbacatePayApiError &&
      error.message.toLowerCase().includes("card is not available")
    ) {
      return {
        error:
          "Os pagamentos recorrentes por cartão ainda não foram habilitados pela AbacatePay para esta loja.",
      };
    }

    console.error("Failed to create AbacatePay checkout", error);
    return {
      error:
        "Não foi possível abrir o pagamento agora. Tente novamente em alguns instantes.",
    };
  }

  redirect(checkoutUrl);
}
