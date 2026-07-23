import Link from "next/link";
import { classNames } from "./classNames";
import styles from "./Pagination.module.css";

export type PaginationSearchParams = Record<
  string,
  string | number | Array<string | number> | null | undefined
>;

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: PaginationSearchParams;
  pageParam?: string;
  ariaLabel?: string;
  className?: string;
}

type PaginationItem = number | "ellipsis";

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visiblePages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const pages = [...visiblePages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
  const items: PaginationItem[] = [];

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1];
    if (previousPage && page - previousPage === 2) {
      items.push(previousPage + 1);
    } else if (previousPage && page - previousPage > 2) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

function buildPageHref(
  basePath: string,
  searchParams: PaginationSearchParams,
  pageParam: string,
  page: number,
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === pageParam || value === null || value === undefined || value === "") {
      return;
    }
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => params.append(key, String(item)));
  });

  if (page > 1) {
    params.set(pageParam, String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  ariaLabel = "Paginação",
  basePath,
  className,
  currentPage,
  pageParam = "page",
  searchParams = {},
  totalPages,
}: PaginationProps) {
  const safeTotal = Number.isFinite(totalPages)
    ? Math.max(0, Math.trunc(totalPages))
    : 0;

  if (safeTotal <= 1) {
    return null;
  }

  const requestedPage = Number.isFinite(currentPage) ? Math.trunc(currentPage) : 1;
  const safeCurrent = Math.min(safeTotal, Math.max(1, requestedPage));
  const items = getPaginationItems(safeCurrent, safeTotal);

  const pageLink = (page: number, label: string, content: string) => (
    <Link
      aria-label={label}
      className={styles.pageLink}
      href={buildPageHref(basePath, searchParams, pageParam, page)}
    >
      {content}
    </Link>
  );

  return (
    <nav
      aria-label={ariaLabel}
      className={classNames(styles.pagination, className)}
    >
      {safeCurrent > 1 ? (
        pageLink(safeCurrent - 1, "Ir para a página anterior", "← Anterior")
      ) : (
        <span aria-disabled="true" className={classNames(styles.pageLink, styles.disabled)}>
          ← Anterior
        </span>
      )}

      <ol className={styles.pages}>
        {items.map((item, index) => (
          <li key={item === "ellipsis" ? `ellipsis-${index}` : item}>
            {item === "ellipsis" ? (
              <span aria-hidden="true" className={styles.ellipsis}>…</span>
            ) : item === safeCurrent ? (
              <span
                aria-current="page"
                aria-label={`Página ${item}, página atual`}
                className={classNames(styles.number, styles.current)}
              >
                {item}
              </span>
            ) : (
              <Link
                aria-label={`Ir para a página ${item}`}
                className={styles.number}
                href={buildPageHref(basePath, searchParams, pageParam, item)}
              >
                {item}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {safeCurrent < safeTotal ? (
        pageLink(safeCurrent + 1, "Ir para a próxima página", "Próxima →")
      ) : (
        <span aria-disabled="true" className={classNames(styles.pageLink, styles.disabled)}>
          Próxima →
        </span>
      )}
    </nav>
  );
}
