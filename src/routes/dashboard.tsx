import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — VerticalParts" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="rounded-md border-t-4 border-primary bg-white p-10 text-center shadow-xl">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-2xl font-extrabold">Dashboard em construção</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-600">
          Login mockado funcionando. O painel completo virá na próxima iteração.
        </p>
        <Link to="/login" className="mt-6 inline-block border-b-2 border-primary pb-px text-sm font-bold">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}