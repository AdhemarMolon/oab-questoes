import { PanelShell } from "@/components/panel";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
