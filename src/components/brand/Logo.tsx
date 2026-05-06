import vpMark from "@/assets/vp-mark.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
  invert?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { mark: "h-7 w-7", text: "text-base" },
  md: { mark: "h-10 w-10", text: "text-xl" },
  lg: { mark: "h-14 w-14", text: "text-3xl" },
};

export function Logo({ className, variant = "full", invert = false, size = "md" }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img src={vpMark} alt="VerticalParts" className={cn(s.mark, "object-contain")} />
      {variant === "full" && (
        <span className={cn("font-extrabold tracking-tight uppercase leading-none", s.text)}>
          <span style={{ color: invert ? "#FFFFFF" : "#808080" }}>Vertical</span>
          <span style={{ color: "#F5C400" }}>Parts</span>
        </span>
      )}
    </div>
  );
}