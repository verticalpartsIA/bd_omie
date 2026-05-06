import { forwardRef, type InputHTMLAttributes, type ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  containerClassName?: string;
  passwordToggle?: boolean;
  help?: ReactNode;
  state?: "default" | "error" | "success";
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, containerClassName, passwordToggle, help, state = "default", type, className, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  const inputType = passwordToggle ? (show ? "text" : "password") : type;

  return (
    <div className={cn("mb-4", containerClassName)}>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-700">{label}</label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</span>
        )}
        <input
          ref={ref}
          type={inputType}
          className={cn(
            "w-full rounded border bg-white py-3.5 pr-3.5 text-sm text-black outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/20",
            icon ? "pl-11" : "pl-3.5",
            state === "error" && "border-red-600 focus:border-red-600 focus:ring-red-600/15",
            state === "success" && "border-green-600",
            state === "default" && "border-neutral-200",
            className,
          )}
          {...props}
        />
        {passwordToggle && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-black"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {help && (
        <div
          className={cn(
            "mt-1.5 flex items-center gap-1.5 text-xs",
            state === "error" ? "text-red-600" : state === "success" ? "text-green-600" : "text-neutral-500",
          )}
        >
          {help}
        </div>
      )}
    </div>
  );
});