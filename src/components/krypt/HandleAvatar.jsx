import { handleColor, initials } from "@/lib/krypt";
import { cn } from "@/lib/utils";

export default function HandleAvatar({ name, size = 34, className, ring = false }) {
  const color = handleColor(name);
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-xl font-mono font-medium uppercase",
        ring && "ring-1 ring-white/10",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.34),
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}