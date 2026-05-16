import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { ClaudeChat, type ClaudeChatHandle } from "@/components/app/ClaudeChat";
import { useAuth } from "@/lib/auth-mock";
import { useStrategicDashboard } from "@/hooks/useStrategicDashboard";

const SidebarToggleContext = createContext<() => void>(() => {});
export const useSidebarToggle = () => useContext(SidebarToggleContext);

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

// ── ClaudeChat global — renderiza apenas no cliente para evitar SSR issues ────

function GlobalClaudeChat() {
  const claudeRef = useRef<ClaudeChatHandle>(null);
  const strategic = useStrategicDashboard();
  return (
    <ClaudeChat
      ref={claudeRef}
      kpis={strategic.kpis}
      alertas={strategic.cockpitCEO}
      concentracao={strategic.concentracao}
    />
  );
}

// ── Layout principal ───────────────────────────────────────────────────────────

function AppLayout() {
  const { isAuthenticated, hydrated } = useAuth();
  const navigate = useNavigate();
  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;
  const [collapsed, setCollapsed] = useState(isMobile);
  const [clientMounted, setClientMounted] = useState(false);
  const toggle = () => setCollapsed((c) => !c);

  useEffect(() => {
    setClientMounted(true);
    // Auto-collapse on resize below mobile breakpoint
    const onResize = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // P0: aguarda hidratação do auth antes de redirecionar — evita que
  // deep links e refreshes joguem usuário autenticado para /login
  useEffect(() => {
    if (hydrated && !isAuthenticated) navigate({ to: "/login" });
  }, [hydrated, isAuthenticated, navigate]);

  // Enquanto o localStorage ainda não foi lido, exibe tela neutra
  // (evita flash de conteúdo ou redirect prematuro)
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F4F5F7]">
      <AppSidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SidebarToggleContext.Provider value={toggle}>
          <Outlet />
        </SidebarToggleContext.Provider>
      </div>
      {/* IA flutuante — só no cliente, evita erro SSR do Supabase client */}
      {clientMounted && <GlobalClaudeChat />}
    </div>
  );
}