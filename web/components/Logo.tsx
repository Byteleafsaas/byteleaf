import Link from 'next/link';

export function LogoMark({ size = 32, dot = true }: { size?: number; dot?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#1877F2" />
      <path d="M8 24C8 14 14 8 24 8C24 18 18 24 8 24Z" fill="#FFFFFF" />
      <path d="M8.5 23.5L18 14M13 19h4.5M15.5 16.5v-3.5" stroke="#1877F2" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {dot && <circle cx="18" cy="14" r="1.6" fill="#1877F2" />}
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="byteleaf home">
      <LogoMark />
      <span>
        byte<b>leaf</b>
      </span>
    </Link>
  );
}
