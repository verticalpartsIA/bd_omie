import { createFileRoute } from "@tanstack/react-router";
import { MonitorPlay } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";

export const Route = createFileRoute("/_app/operational" as never)({
  head: () => ({ meta: [{ title: "Operational Dashboard — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "vendedor", "estoque"]}>
      <OperationalDashboard />
    </RoleGuard>
  ),
});

function OperationalDashboard() {
  const toggle = useSidebarToggle();
  return (
    <>
      <Topbar
        crumb="DASHBOARDS · OPERATIONAL"
        title="Operational Dashboard"
        icon={<MonitorPlay className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="rounded-md border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-lg font-extrabold">Operational Dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">Em construção — visão TV/Operação será montada na próxima iteração.</p>
        </div>
      </main>
    </>
  );
}
