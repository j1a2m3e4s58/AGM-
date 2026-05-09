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
            <stop offset="0%" stopColor="#2f7b5d" />
            <stop offset="55%" stopColor="#215845" />
            <stop offset="100%" stopColor="#163d30" />
          </linearGradient>
          <linearGradient id="agmGlow" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#d8fff2" />
            <stop offset="100%" stopColor="#86dfb7" />
          </linearGradient>
        </defs>

        <rect
          x="10"
          y="10"
          width="108"
          height="108"
          fill="url(#agmPanel)"
          opacity="0.96"
        />

        <path
          d="M64 16 100 30v31c0 25-14 44-36 55C42 105 28 86 28 61V30L64 16Z"
          fill="none"
          stroke="url(#agmGlow)"
          strokeWidth="4"
        />
        <path
          d="M43 79V51h17c7 0 13 5 13 12 0 7-6 12-13 12H51v4h21c3 0 6-1 8-3l10-10c3-3 4-7 4-11V44"
          fill="none"
          stroke="#F3FFF9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d="M51 44h24c5 0 9 4 9 9v5"
          fill="none"
          stroke="#F3FFF9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d="M66 62l13 13 18-18"
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
