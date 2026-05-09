import { cn } from "@/lib/utils";

export function AnimatedAgmMark({
  className,
  size = 64,
  animate = true,
  label = "AGM app mark",
}: {
  className?: string;
  size?: number;
  animate?: boolean;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden border border-primary/35 bg-card/95 shadow-[0_14px_34px_rgba(8,12,28,0.35)]",
        animate ? "agm-mark-shell agm-mark-pulse" : "",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={label}
      role="img"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          animate ? "agm-mark-sheen" : "",
        )}
      />
      <svg
        viewBox="0 0 128 128"
        className={cn("h-[78%] w-[78%]", animate ? "agm-mark-core" : "")}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="agmShield" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#7db2ff" />
            <stop offset="55%" stopColor="#487cf4" />
            <stop offset="100%" stopColor="#2748a7" />
          </linearGradient>
          <linearGradient id="agmStroke" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#d8e6ff" />
            <stop offset="100%" stopColor="#6ea3ff" />
          </linearGradient>
        </defs>

        <path
          d="M64 8 104 24v35c0 28-16 49-40 61C40 108 24 87 24 59V24L64 8Z"
          fill="url(#agmShield)"
          stroke="url(#agmStroke)"
          strokeWidth="4"
        />

        <path
          d="M37 85 49 42h10l13 30 12-30h10l11 43h-11l-6-25-10 25H78L67 58 59 85H37Z"
          fill="#f5f8ff"
          opacity="0.98"
        />

        <path
          d="M39 90h50"
          stroke="#8cb4ff"
          strokeLinecap="round"
          strokeOpacity="0.85"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
}
