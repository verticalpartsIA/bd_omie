import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Mail, Lock, User, Building2, Target, BarChart3, Wrench, ArrowRight } from "lucide-react";
import { AuthSwitcher, SplitShell, FormHead, Field } from "@/components/auth/index";
import { useAuth, profileLanding, type Profile } from "@/lib/auth-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Criar conta — VerticalParts" }] }),
  component: RegisterPage,
});

const roles: { id: Profile; name: string; desc: string; Icon: typeof Target }[] = [
  { id: "estrategico", name: "Estratégico", desc: "Visão executiva", Icon: Target },
  { id: "analitico", name: "Analítico", desc: "Relatórios e KPIs", Icon: BarChart3 },
  { id: "operacional", name: "Operacional", desc: "Pedidos e estoque", Icon: Wrench },
];

function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [role, setRole] = useState<Profile>("estrategico");
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => passwordScore(pw), [pw]);
  const matches = pw.length > 0 && pw === pw2;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!matches) return;
    setLoading(true);
    const u = await register(nome, email, pw, role);
    setLoading(false);
    navigate({ to: profileLanding[u.profile] });
  }

  void empresa;

  const lvl = ["", "Fraca", "Razoável", "Boa", "Forte"][score];
  const lvlColor = ["text-neutral-500", "text-red-600", "text-orange-500", "text-[#C99E00]", "text-green-600"][score];
  const barColor = ["bg-neutral-200", "bg-red-600", "bg-orange-500", "bg-primary", "bg-green-600"];

  return (
    <>
      <AuthSwitcher />
      <SplitShell
        eyebrow="Crie sua conta"
        title={
          <>
            Comece a operar com a <span className="text-primary">VerticalParts.</span>
          </>
        }
        description="Cadastre sua empresa em minutos e tenha acesso a estoque, preços e suporte de engenharia."
        features={[
          "Aprovação de cadastro em 24h",
          "Linha de crédito pré-aprovada",
          "Dashboards segmentados por papel",
        ]}
      >
        <FormHead
          eyebrow="Novo cadastro"
          title="Criar sua conta"
          description="Preencha os dados para liberar o acesso à plataforma."
        />

        <form onSubmit={onSubmit}>
          <Field
            label="Nome completo"
            placeholder="João da Silva"
            required
            icon={<User className="h-4 w-4" />}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Field
            label="E-mail corporativo"
            type="email"
            placeholder="joao@empresa.com.br"
            autoComplete="email"
            required
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Nome da empresa"
            placeholder="Manutenções Silva Ltda"
            required
            icon={<Building2 className="h-4 w-4" />}
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          />

          <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field
              label="Senha"
              passwordToggle
              required
              placeholder="••••••••••"
              icon={<Lock className="h-4 w-4" />}
              containerClassName="mb-0"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <Field
              label="Confirmar senha"
              passwordToggle
              required
              placeholder="••••••••••"
              icon={<Lock className="h-4 w-4" />}
              containerClassName="mb-0"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              state={pw2.length > 0 ? (matches ? "success" : "error") : "default"}
            />
          </div>

          {pw.length > 0 && (
            <div className="mb-4">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn("h-1 flex-1 rounded-sm", i < score ? barColor[score] : "bg-neutral-200")} />
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em]">
                <span className="text-neutral-500">Força da senha</span>
                <span className={lvlColor}>{lvl || "—"}</span>
              </div>
            </div>
          )}

          <div className="mb-5">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-700">
              Função na empresa <span className="text-neutral-400">(role)</span>
            </label>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {roles.map((r) => {
                const checked = role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={cn(
                      "rounded border bg-white p-3.5 text-center transition",
                      checked
                        ? "border-2 border-primary bg-primary/10 p-[13px]"
                        : "border-neutral-200 hover:border-neutral-400",
                    )}
                  >
                    <r.Icon className={cn("mx-auto mb-1.5 h-5 w-5", checked ? "text-black" : "text-neutral-700")} />
                    <span className="block text-xs font-bold uppercase tracking-wider text-black">{r.name}</span>
                    <span className="mt-0.5 block text-[10px] text-neutral-500">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !matches}
            className="flex w-full items-center justify-center gap-2.5 rounded bg-primary px-5 py-4 text-sm font-bold tracking-wide text-black transition hover:-translate-y-0.5 hover:bg-[#FFD400] hover:shadow-[0_12px_28px_rgba(245,196,0,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar conta"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-6 text-center text-[13px] text-neutral-700">
            Já tem uma conta?{" "}
            <Link to="/login" className="border-b-2 border-primary pb-px font-bold text-black hover:text-[#C99E00]">
              Entrar
            </Link>
          </p>
        </form>
      </SplitShell>
    </>
  );
}