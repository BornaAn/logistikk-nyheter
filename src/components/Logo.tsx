export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#logoGrad)" />
      <rect x="7" y="9" width="8" height="6" rx="1" fill="var(--accent-foreground)" />
      <rect
        x="17"
        y="9"
        width="8"
        height="6"
        rx="1"
        fill="var(--accent-foreground)"
        opacity="0.55"
      />
      <rect
        x="7"
        y="17.5"
        width="18"
        height="5.5"
        rx="1"
        fill="var(--accent-foreground)"
        opacity="0.85"
      />
    </svg>
  );
}
