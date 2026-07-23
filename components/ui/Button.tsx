import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
} from "react";
import { classNames } from "./classNames";
import styles from "./Button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export type ButtonSize = "small" | "medium" | "large";

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleProps {
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  loading = false,
  loadingLabel = "Carregando",
  size = "medium",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classNames(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <span aria-hidden="true" className={styles.spinner} /> : null}
      {loading ? <span className={styles.srOnly}>{loadingLabel}: </span> : null}
      <span>{children}</span>
    </button>
  );
}

export type LinkButtonProps = ComponentProps<typeof Link> &
  ButtonStyleProps & {
    children: ReactNode;
  };

export function LinkButton({
  children,
  className,
  fullWidth = false,
  size = "medium",
  variant = "primary",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={classNames(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
    >
      <span>{children}</span>
    </Link>
  );
}
