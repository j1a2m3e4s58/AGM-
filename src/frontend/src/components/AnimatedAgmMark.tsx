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
        "relative inline-flex items-center justify-center overflow-hidden border border-[#5abf95]/40 bg-[#1a5a46] shadow-[0_14px_34px_rgba(5,18,13,0.38)]",
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
          <linearGradient id="agmPanel" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#2F8E68" />
            <stop offset="48%" stopColor="#23684D" />
            <stop offset="100%" stopColor="#173F31" />
          </linearGradient>
          <linearGradient id="agmGlow" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#F4FFF9" />
            <stop offset="100%" stopColor="#B7F2D4" />
          </linearGradient>
        </defs>

        <rect
          x="12"
          y="12"
          width="104"
          height="104"
          fill="url(#agmPanel)"
          opacity="0.96"
        />

        <path
          d="M63 31c-17 0-31 14-31 31s14 31 31 31c12 0 23-7 28-18H73"
          fill="none"
          stroke="url(#agmGlow)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d="M91 54 74 71"
          fill="none"
          stroke="#F3FFF9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d="M75 71H56"
          fill="none"
          stroke="#F3FFF9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d="M91 54v21H75"
          fill="none"
          stroke="#F3FFF9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
      </svg>
    </div>
  );
}
