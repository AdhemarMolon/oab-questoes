import { redirect } from "next/navigation";

import { AdminPlatformShell } from "@/components/shell";
import { AuthConfigurationError } from "@/lib/auth";
import { AuthAccessError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

async function getAdministrator() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof AuthAccessError) {
      redirect(error.code === "AUTHENTICATION_REQUIRED" ? "/entrar?next=/admin" : "/painel");
    }
    if (error instanceof AuthConfigurationError) redirect("/entrar?next=/admin");
    throw error;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const administrator = await getAdministrator();
  return (
    <AdminPlatformShell administrator={{ name: administrator.user.name }}>
      {children}
    </AdminPlatformShell>
  );
}
