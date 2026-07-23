"use client";

import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, type ButtonProps } from "@/components/ui/Button";
import styles from "./GoogleSignInButton.module.css";

export type GoogleSignInButtonProps = Omit<
  ButtonProps,
  "children" | "loading" | "loadingLabel" | "onClick" | "type"
> & {
  callbackURL?: string;
  label?: string;
  onError?: (message: string) => void;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Não foi possível iniciar o login com o Google. Tente novamente.";
}

export function GoogleSignInButton({
  callbackURL = "/",
  disabled,
  fullWidth = true,
  label = "Continuar com o Google",
  onError,
  ...buttonProps
}: GoogleSignInButtonProps) {
  const errorId = useId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSignIn() {
    setErrorMessage(null);
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result.error) {
        const message =
          result.error.message ||
          "O login com o Google está temporariamente indisponível.";
        setErrorMessage(message);
        onError?.(message);
        setIsPending(false);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      onError?.(message);
      setIsPending(false);
    }
  }

  return (
    <div className={styles.container}>
      <Button
        {...buttonProps}
        aria-describedby={errorMessage ? errorId : undefined}
        disabled={disabled}
        fullWidth={fullWidth}
        loading={isPending}
        loadingLabel="Conectando ao Google"
        onClick={handleSignIn}
        type="button"
        variant="secondary"
      >
        <span className={styles.label}>
          <svg
            aria-hidden="true"
            className={styles.icon}
            viewBox="0 0 24 24"
          >
            <path
              d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
              fill="#4285F4"
            />
            <path
              d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
              fill="#34A853"
            />
            <path
              d="M6.39 13.86A6.01 6.01 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z"
              fill="#FBBC05"
            />
            <path
              d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"
              fill="#EA4335"
            />
          </svg>
          <span>{label}</span>
        </span>
      </Button>

      {errorMessage ? (
        <p className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
