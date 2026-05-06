import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { useAuth } from "@/lib/auth-mock";

const SidebarToggleContext = createContext<() => void>(() => {});
export const useSidebarToggle = () => useContext(SidebarToggleContext);

export const Route = createFileRoute("/_app" as never)({
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const toggle = () => setCollapsed((c) => !c);

  useEffect(() => {
    if (!isAuthenticated) navigate({ to: "/login" });
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen w-full bg-[#F4F5F7]">
      <AppSidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SidebarToggleContext.Provider value={toggle}>
          <Outlet />
        </SidebarToggleContext.Provider>
      </div>
    </div>
  );
}