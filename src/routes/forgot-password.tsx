import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthSwitcher, CenteredShell, FormHead, Field } from "@/components/auth/index";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar acesso — VerticalParts" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      {import.meta.env.DEV && <AuthSwitcher />}
      <CenteredShell>
        <FormHead
          eyebrow="Recuperar acesso"
          title="Esqueceu a senha?"
          description="Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha."
          centered
        />

        {sent && (
          <div className="mb-5 flex items-start gap-3 rounded border-l-[3px] border-green-700 bg-green-700/10 p-3.5 text-[13px] leading-relaxed text-green-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong className="mb-0.5 block text-black">Link enviado.</strong>
              Confira sua caixa de entrada e siga as instruções nos próximos 30 minutos.
            </div>
          </div>
        )}

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
          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2.5 rounded bg-primary px-5 py-4 text-sm font-bold tracking-wide text-black transition hover:-translate-y-0.5 hover:bg-[#FFD400] hover:shadow-[0_12px_28px_rgba(245,196,0,0.30)]"
          >
            Enviar link de redefinição
            <Send className="h-4 w-4" />
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