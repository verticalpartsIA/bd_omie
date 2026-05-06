import type { ReactNode } from "react";

export function FormHead({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={`mb-8 ${centered ? "text-center" : ""}`}>
      <span className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C99E00] before:h-0.5 before:w-6 before:bg-primary before:content-['']">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-black">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{description}</p>
    </div>
  );
}