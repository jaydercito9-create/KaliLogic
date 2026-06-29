import Link from "next/link";

type BrandLogoProps = {
  compact?: boolean;
  href?: string;
  inverse?: boolean;
};

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="kalilogic-mark" x1="5" y1="4" x2="42" y2="45">
          <stop stopColor="#0667FF" />
          <stop offset="0.52" stopColor="#2F46FF" />
          <stop offset="1" stopColor="#8424FF" />
        </linearGradient>
      </defs>
      <rect x="3" y="4" width="12" height="40" rx="4" fill="url(#kalilogic-mark)" />
      <path
        d="M14.5 20.8 29.8 5.6A5.5 5.5 0 0 1 33.7 4H42a2.2 2.2 0 0 1 1.6 3.7L27.2 24l16.4 16.3A2.2 2.2 0 0 1 42 44h-8.3a5.5 5.5 0 0 1-3.9-1.6L14.5 27.2a4.5 4.5 0 0 1 0-6.4Z"
        fill="url(#kalilogic-mark)"
      />
      <rect x="28.5" y="19.5" width="9" height="9" rx="2" transform="rotate(45 28.5 19.5)" fill="url(#kalilogic-mark)" />
    </svg>
  );
}

export function BrandLogo({ compact = false, href = "/", inverse = false }: BrandLogoProps) {
  return (
    <Link href={href} className="brand-logo" aria-label="KaliLogic, ir al inicio">
      <BrandMark className="brand-logo__mark" />
      {!compact && (
        <span className={inverse ? "brand-logo__text brand-logo__text--inverse" : "brand-logo__text"}>
          kali<span>logic</span>
        </span>
      )}
    </Link>
  );
}
