import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

export function CenteredShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-6"
      style={{ background: "radial-gradient(circle at 80% 20%, #1c1c1c, #000 60%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,196,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,196,0,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at 50% 30%, #000 30%, transparent 70%)",
        }}
      />
      <div
        className="relative z-10 w-full max-w-[460px] rounded-md border-t-4 border-primary bg-white px-8 py-12 md:px-10"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
      >
        <div className="mb-7 flex justify-center">
          <Logo size="md" />
        </div>
        {children}
      </div>
    </div>
  );
}