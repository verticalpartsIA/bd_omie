import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Lock, Check, ArrowLeft, CheckCheck } from "lucide-react";
import { AuthSwitcher, CenteredShell, FormHead, Field } from "@/components/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — VerticalParts" }] }),
  component: ResetPage,
});

function score(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const s = useMemo(() => score(pw), [pw]);
  const matches = pw.length > 0 && pw === pw2;

  const rules = [
    { ok: pw.length >= 8, label: "Mínimo de 8 caracteres" },
    { ok: /[A-Z]/.test(pw), label: "Letra maiúscula" },
    { ok: /[0-9]/.test(pw), label: "Pelo menos um número" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "Caractere especial" },
  ];

  const lvl = ["—", "Fraca", "Razoável", "Boa", "Forte"][s];
  const lvlColor = ["text-neutral-500", "text-red-600", "text-orange-500", "text-[#C99E00]", "text-green-600"][s];
  const barColor = ["bg-neutral-200", "bg-red-600", "bg-orange-500", "bg-primary", "bg-green-600"];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!matches || s < 3) return;
    navigate({ to: "/login" });
  }

  return (
    <>
      <AuthSwitcher />
      <CenteredShell>
        <FormHead
          eyebrow="Nova senha"
          title="Defina sua nova senha"
          description="Escolha uma senha forte. Você fará login com ela em seguida."
          centered
        />

        <form onSubmit={onSubmit}>
          <Field
            label="Nova senha"
            passwordToggle
            required
            placeholder="••••••••••"
            icon={<Lock className="h-4 w-4" />}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            containerClassName="mb-3"
          />

          <div className="mb-3 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-sm", i < s ? barColor[s] : "bg-neutral-200")} />
            ))}
          </div>
          <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className="text-neutral-500">Força da senha</span>
            <span className={lvlColor}>{lvl}</span>
          </div>

          <ul className="mb-5 grid gap-1.5">
            {rules.map((r) => (
              <li
                key={r.label}
                className={cn("flex items-center gap-2 text-xs", r.ok ? "text-green-600" : "text-neutral-500")}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                    r.ok ? "border-green-600 bg-green-600 text-white" : "border-neutral-300",
                  )}
                >
                  {r.ok && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                </span>
                {r.label}
              </li>
            ))}
          </ul>

          <Field
            label="Confirmar nova senha"
            passwordToggle
            required
            placeholder="••••••••••"
            icon={<Lock className="h-4 w-4" />}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            state={pw2.length > 0 ? (matches ? "success" : "error") : "default"}
            help={
              pw2.length > 0 && matches ? (
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="h-3.5 w-3.5" /> As senhas coincidem.
                </span>
              ) : null
            }
          />

          <button
            type="submit"
            disabled={!matches || s < 3}
            className="mt-2 flex w-full items-center justify-center gap-2.5 rounded bg-primary px-5 py-4 text-sm font-bold tracking-wide text-black transition hover:-translate-y-0.5 hover:bg-[#FFD400] hover:shadow-[0_12px_28px_rgba(245,196,0,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Atualizar senha
            <Check className="h-4 w-4" strokeWidth={3} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-700 hover:text-black">
            <ArrowLeft className="h-4 w-4" /> Voltar para o login
          </Link>
        </div>
      </CenteredShell>
    </>
  );
}