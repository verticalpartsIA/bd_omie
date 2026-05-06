import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { AuthSwitcher, SplitShell, FormHead, Field } from "@/components/auth/index";
import { useAuth } from "@/lib/auth-mock";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — VerticalParts" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
    navigate({ to: "/dashboard" });
  }

  return (
    <>
      <AuthSwitcher />
      <SplitShell
        eyebrow="Plataforma B2B"
        title={
          <>
            Bem-vindo
            <br />
            de volta à <span className="text-primary">VerticalParts.</span>
          </>
        }
        description="Acesse dashboards, controle de estoque e relatórios técnicos em um só lugar."
        features={[
          "Mais de 4.000 SKUs catalogados",
          "Suporte técnico em até 24h",
          "Integração segura com gestão de acesso",
        ]}
      >
        <FormHead
          eyebrow="Acessar Conta"
          title="Entrar na plataforma"
          description="Use seu e-mail corporativo e senha cadastrados."
        />

        <form onSubmit={onSubmit}>
          <Field
            label="E-mail"
            type="email"
            placeholder="seu@email.com.br"
            autoComplete="email"
            required
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Senha"
            placeholder="••••••••••"
            autoComplete="current-password"
            required
            passwordToggle
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="-mt-1 mb-5 flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] text-neutral-700">
              <input type="checkbox" className="h-4 w-4 accent-[#F5C400]" /> Lembrar de mim
            </label>
            <Link to="/forgot-password" className="text-[13px] font-semibold text-[#C99E00] hover:text-black">
              Esqueceu a senha?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded bg-primary px-5 py-4 text-sm font-bold tracking-wide text-black transition hover:-translate-y-0.5 hover:bg-[#FFD400] hover:shadow-[0_12px_28px_rgba(245,196,0,0.30)] disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-6 text-center text-[13px] text-neutral-700">
            Não tem uma conta?{" "}
            <Link to="/register" className="border-b-2 border-primary pb-px font-bold text-black hover:text-[#C99E00]">
              Cadastrar
            </Link>
          </p>
        </form>
      </SplitShell>
    </>
  );
}