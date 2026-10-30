import type { ReactNode } from 'react';

type IconProps = { size?: number; stroke?: string; sw?: number; className?: string; style?: React.CSSProperties };

function base({ size = 24, stroke = 'currentColor', sw = 2, className, style }: IconProps, children: ReactNode, extra?: object) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style} {...extra}>
      {children}
    </svg>
  );
}

export const ArrowIcon = (p: IconProps) => base({ size: 18, sw: 2.2, className: 'arr', ...p }, <path d="M5 12h14M13 6l6 6-6 6" />);
export const CheckIcon = (p: IconProps) => base({ size: 20, stroke: 'var(--blue-600)', sw: 2.4, ...p }, <path d="M5 12l5 5L20 7" />);
export const PlusIcon = (p: IconProps) => base({ size: 20, stroke: 'var(--blue-600)', sw: 2.2, ...p }, <path d="M12 5v14M5 12h14" />);
export const ChevronLeft = (p: IconProps) => base({ size: 18, sw: 2.2, ...p }, <path d="M15 6l-6 6 6 6" />);
export const ChevronRight = (p: IconProps) => base({ size: 18, sw: 2.2, ...p }, <path d="M9 6l6 6-6 6" />);
export const MenuIcon = (p: IconProps) => base({ size: 22, ...p }, <path d="M4 7h16M4 12h16M4 17h16" />);
export const CloseIcon = (p: IconProps) => base({ size: 22, ...p }, <path d="M6 6l12 12M18 6L6 18" />);
export const MailIcon = (p: IconProps) => base({ size: 20, stroke: 'var(--blue-on-dark)', ...p }, <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
export const PhoneIcon = (p: IconProps) => base({ size: 20, stroke: 'var(--blue-on-dark)', ...p }, <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />);
export const PinIcon = (p: IconProps) => base({ size: 20, stroke: 'var(--blue-on-dark)', ...p }, <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>);
export const ClockIcon = (p: IconProps) => base({ size: 20, stroke: 'var(--blue-on-dark)', ...p }, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);

export const DesignIcon = (p: IconProps) => base({ sw: 1.8, ...p }, <><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.6 7.6" /><circle cx="11" cy="11" r="2" /></>);
export const FrontendIcon = (p: IconProps) => base({ sw: 1.8, ...p }, <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4M9 8l-2 2 2 2M15 8l2 2-2 2" /></>);
export const BackendIcon = (p: IconProps) => base({ sw: 1.8, ...p }, <><rect x="3" y="3" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="7" rx="2" /><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6" /></>);
export const AiIcon = (p: IconProps) => base({ sw: 1.8, ...p }, <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4M10 10h4v4h-4z" /></>);
export const SparkIcon = (p: IconProps) => base({ size: 14, stroke: '#FFFFFF', sw: 2.2, ...p }, <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />);

const SERVICE_ICONS = { design: DesignIcon, frontend: FrontendIcon, backend: BackendIcon, ai: AiIcon } as const;
export function ServiceIcon({ name }: { name: keyof typeof SERVICE_ICONS | string }) {
  const C = SERVICE_ICONS[name as keyof typeof SERVICE_ICONS];
  return <C />;
}
