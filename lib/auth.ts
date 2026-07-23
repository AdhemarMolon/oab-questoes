import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import { authSchema } from "@/db/schema";

export const AUTH_ENVIRONMENT_VARIABLES = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

export type AuthEnvironmentVariable =
  (typeof AUTH_ENVIRONMENT_VARIABLES)[number];

export type AuthConfigurationIssue = {
  variable: AuthEnvironmentVariable;
  reason: string;
};

export type AuthConfiguration =
  | {
      configured: true;
      issues: [];
    }
  | {
      configured: false;
      issues: AuthConfigurationIssue[];
    };

type AuthEnvironment = Record<AuthEnvironmentVariable, string>;

function readEnvironment(): Record<AuthEnvironmentVariable, string | undefined> {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };
}

function isValidUrl(value: string, protocols: string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function getAuthConfiguration(): AuthConfiguration {
  const environment = readEnvironment();
  const issues: AuthConfigurationIssue[] = [];

  for (const variable of AUTH_ENVIRONMENT_VARIABLES) {
    if (!environment[variable]?.trim()) {
      issues.push({
        variable,
        reason: "variável ausente",
      });
    }
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  if (
    databaseUrl &&
    !isValidUrl(databaseUrl, ["postgres:", "postgresql:"])
  ) {
    issues.push({
      variable: "DATABASE_URL",
      reason: "deve ser uma URL PostgreSQL válida",
    });
  }

  const baseUrl = environment.BETTER_AUTH_URL?.trim();
  if (baseUrl && !isValidUrl(baseUrl, ["http:", "https:"])) {
    issues.push({
      variable: "BETTER_AUTH_URL",
      reason: "deve ser uma URL HTTP ou HTTPS absoluta",
    });
  }

  const secret = environment.BETTER_AUTH_SECRET?.trim();
  if (secret && secret.length < 32) {
    issues.push({
      variable: "BETTER_AUTH_SECRET",
      reason: "deve conter pelo menos 32 caracteres",
    });
  }

  if (issues.length > 0) {
    return { configured: false, issues };
  }

  return { configured: true, issues: [] };
}

export class AuthConfigurationError extends Error {
  readonly code = "AUTH_NOT_CONFIGURED";
  readonly status = 503;
  readonly issues: AuthConfigurationIssue[];

  constructor(issues: AuthConfigurationIssue[]) {
    const details = issues
      .map(({ variable, reason }) => `${variable} (${reason})`)
      .join(", ");

    super(
      `A autenticação ainda não está configurada. Revise: ${details}.`,
    );
    this.name = "AuthConfigurationError";
    this.issues = issues;
  }
}

export function isAuthConfigurationError(
  error: unknown,
): error is AuthConfigurationError {
  return error instanceof AuthConfigurationError;
}

function requireAuthEnvironment(): AuthEnvironment {
  const configuration = getAuthConfiguration();

  if (!configuration.configured) {
    throw new AuthConfigurationError(configuration.issues);
  }

  return readEnvironment() as AuthEnvironment;
}

function createAuth(environment: AuthEnvironment) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
      transaction: false,
    }),
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: environment.GOOGLE_CLIENT_ID,
        clientSecret: environment.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      encryptOAuthTokens: true,
    },
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],
  });
}

export type AppAuth = ReturnType<typeof createAuth>;

let authInstance: AppAuth | undefined;

/**
 * Returns the shared Better Auth instance only when all runtime settings exist.
 * Keeping initialization behind this function lets `next build` run before
 * deployment secrets are attached, without silently using unsafe fallbacks.
 */
export function getAuth(): AppAuth {
  if (!authInstance) {
    authInstance = createAuth(requireAuthEnvironment());
  }

  return authInstance;
}
