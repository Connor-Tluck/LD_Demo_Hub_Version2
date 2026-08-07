// Inline SVG icons ported from the design file.
import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  style?: CSSProperties;
  strokeWidth?: number;
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const });

export const GridIcon = ({ size = 20, strokeWidth = 1.6, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth={strokeWidth} />
  </svg>
);

export const HomeIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M4 11l8-7 8 7M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SidebarIcon = ({ size = 20, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 4v16" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const ChartIcon = ({ size = 20, strokeWidth = 1.7, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlusIcon = ({ size = 20, strokeWidth = 1.8, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

export const FlagIcon = ({ size = 14, strokeWidth = 1.7, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M5 3v18M5 4h11l-2 3.5L16 11H5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
    <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const XIcon = ({ size = 16, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const EyeIcon = ({ size = 15, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const HeartIcon = ({ size = 15, filled = false, style }: IconProps & { filled?: boolean }) =>
  filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF3D6B" style={{ animation: 'pop .35s ease', ...style }}>
      <path d="M12 21s-7.5-4.7-10-9.3C.6 8.9 2 5.5 5.2 5.5c1.9 0 3.1 1 3.8 2.1.7-1.1 1.9-2.1 3.8-2.1 3.2 0 4.6 3.4 3.2 6.2C19.5 16.3 12 21 12 21z" />
    </svg>
  ) : (
    <svg {...base(size)} style={style}>
      <path d="M12 20.5s-7-4.4-9.4-8.7C1.3 9.2 2.6 6.2 5.4 6.2c1.8 0 2.9 1 3.6 2 .7-1 1.8-2 3.6-2 2.8 0 4.1 3 2.8 5.6C19.6 16.1 12 20.5 12 20.5z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );

export const ExternalIcon = ({ size = 15, strokeWidth = 1.7, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRightIcon = ({ size = 15, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BackIcon = ({ size = 16, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CodeIcon = ({ size = 16, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDownIcon = ({ size = 14, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const ForkIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <circle cx="6" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="18" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6 8.4v3.1c0 1.4 1 2 2 2h8c1 0 2-.6 2-2V8.4M12 13.6v3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const CopyIcon = ({ size = 18, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 15V5a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const SplitIcon = ({ size = 16, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M13 4v16" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export const ReloadIcon = ({ size = 16, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M21 12a9 9 0 11-2.6-6.3M21 3v5h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon = ({ size = 14, color = '#fff', style }: IconProps & { color?: string }) => (
  <svg {...base(size)} style={style}>
    <path d="M5 12l5 5 9-11" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WarnIcon = ({ size = 26, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10.3 3.9L2.5 18a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const InfoIcon = ({ size = 16, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <path d="M12 9v4M12 16.5v.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const MonitorIcon = ({ size = 28, style }: IconProps) => (
  <svg {...base(size)} style={style}>
    <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 21h8M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const LogoIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 2l9 5.5v9L12 22 3 16.5v-9L12 2z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 12l9-4.5M12 12v10M12 12L3 7.5" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
