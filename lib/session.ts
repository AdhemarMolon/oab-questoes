import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export type AuthAccessErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "ADMIN_REQUIRED";

export class AuthAccessError extends Error {
  readonly code: AuthAccessErrorCode;
  readonly status: 401 | 403;

  constructor(code: AuthAccessErrorCode, message: string, status: 401 | 403) {
    super(message);
    this.name = "AuthAccessError";
    this.code = code;
    this.status = status;
  }
}

export async function getCurrentSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export type CurrentSession = NonNullable<
  Awaited<ReturnType<typeof getCurrentSession>>
>;

/**
 * Server-only guard. Callers can map `AuthAccessError.status` to an HTTP
 * response or redirect at the page boundary without coupling the DAL to URLs.
 */
export async function requireUser(): Promise<CurrentSession> {
  const currentSession = await getCurrentSession();

  if (!currentSession) {
    throw new AuthAccessError(
      "AUTHENTICATION_REQUIRED",
      "Faça login para acessar este recurso.",
      401,
    );
  }

  return currentSession;
}

export async function requireAdmin(): Promise<CurrentSession> {
  const currentSession = await requireUser();

  if (currentSession.user.role !== "admin") {
    throw new AuthAccessError(
      "ADMIN_REQUIRED",
      "Este recurso é restrito a administradores.",
      403,
    );
  }

  return currentSession;
}
