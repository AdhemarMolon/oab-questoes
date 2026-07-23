import type { ReactNode, SelectHTMLAttributes } from "react";
import { classNames } from "./classNames";
import styles from "./Field.module.css";

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
  hideLabel?: boolean;
}

export function Select({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  children,
  className,
  containerClassName,
  error,
  hideLabel = false,
  hint,
  id,
  label,
  required,
  ...props
}: SelectProps) {
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
      <span className={styles.selectWrap}>
        <select
          {...props}
          aria-describedby={describedBy}
          aria-invalid={error ? true : ariaInvalid}
          className={classNames(
            styles.control,
            styles.select,
            Boolean(error) && styles.invalid,
            className,
          )}
          id={id}
          required={required}
        >
          {children}
        </select>
      </span>
      {hint ? <span className={styles.hint} id={hintId}>{hint}</span> : null}
      {error ? <span className={styles.error} id={errorId} role="alert">{error}</span> : null}
    </div>
  );
}
