import { toNextJsHandler } from "better-auth/next-js";
import {
  getAuth,
  isAuthConfigurationError,
} from "@/lib/auth";

export const runtime = "nodejs";

async function authHandler(request: Request): Promise<Response> {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    if (isAuthConfigurationError(error)) {
      return Response.json(
        {
          code: error.code,
          message: error.message,
          issues: error.issues,
        },
        {
          status: error.status,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    throw error;
  }
}

export const { GET, POST } = toNextJsHandler(authHandler);
