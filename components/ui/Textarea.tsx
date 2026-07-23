import type { ReactNode, TextareaHTMLAttributes } from "react";
import { classNames } from "./classNames";
import styles from "./Field.module.css";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
  hideLabel?: boolean;
}

export function Textarea({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  containerClassName,
  error,
  hideLabel = false,
  hint,
  id,
  label,
  required,
  ...props
}: TextareaProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={classNames(styles.field, containerClassName)}>
      <label
        className={classNames(styles.label, hideLabel && styles.visuallyHidden)}
        htmlFor={id}
      >
        {label}
        {required ? <span aria-hidden="true" className={styles.required}>*</span> : null}
      </label>
      <textarea
        {...props}
        aria-describedby={describedBy}
        aria-invalid={error ? true : ariaInvalid}
        className={classNames(
          styles.control,
          styles.textarea,
          Boolean(error) && styles.invalid,
          className,
        )}
        id={id}
        required={required}
      />
      {hint ? <span className={styles.hint} id={hintId}>{hint}</span> : null}
      {error ? <span className={styles.error} id={errorId} role="alert">{error}</span> : null}
    </div>
  );
}
