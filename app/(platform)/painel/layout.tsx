import { PanelShell } from "@/components/panel";
import { getUserAccess } from "@/lib/data/access";
import { requireUser } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const access = await getUserAccess(session.user.id);

  return <PanelShell hasAccess={access.hasFullAccess}>{children}</PanelShell>;
}
