/**
 * TrackFinance logo.
 *
 * A rounded emerald "coin" tile holding a bold white chart-line mark
 * that rises into a dot at the apex. Reads as: money + tracking + growth.
 *
 * Colors are hardcoded (not `currentColor`) so the mark is always emerald
 * regardless of where it's mounted.
 *
 * Usage:
 *   <Logo />                       // 32px mark + wordmark
 *   <Logo size="sm" />             // 24px
 *   <Logo size="lg" showWordmark={false} />  // mark only, 48px
 */

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

const MARK_SIZES = { sm: 24, md: 32, lg: 48, xl: 64 } as const;
const WORDMARK_SIZES = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl',
} as const;

export function Logo({
  size = 'md',
  showWordmark = true,
  className = '',
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={MARK_SIZES[size]} />
      {showWordmark && (
        <span
          className={`font-bold tracking-tight text-foreground ${WORDMARK_SIZES[size]}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          TrackFinance
        </span>
      )}
    </div>
  );
}

interface LogoMarkProps {
  size?: number;
  /** Override the tile color (default: emerald-600). */
  color?: string;
  className?: string;
}

/**
 * Just the mark, no wordmark. Colors are hardcoded so it renders correctly
 * even inside dark sidebars or anywhere else.
 */
export function LogoMark({
  size = 32,
  color = '#059669',
  className = '',
}: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="TrackFinance"
    >
      {/* Emerald coin tile */}
      <rect x="0" y="0" width="32" height="32" rx="9" fill={color} />

      {/* Subtle diagonal highlight for depth */}
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#tf-logo-highlight)" opacity="0.22" />

      {/* Bold rising chart line: low-left → high-right */}
      <path
        d="M8 22 L14 16 L18 19 L23 12"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Apex marker: white halo + colored center dot */}
      <circle cx="23" cy="12" r="3.4" fill="white" />
      <circle cx="23" cy="12" r="1.6" fill={color} />

      <defs>
        <linearGradient id="tf-logo-highlight" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
