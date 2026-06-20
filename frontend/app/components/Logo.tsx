/**
 * TrackFinance logo.
 *
 * A rounded indigo "coin" tile holding concentric white rings around a
 * center dot — the brand's ring motif, echoed by the faint background pattern.
 *
 * Colors are hardcoded (not `currentColor`) so the mark is always indigo
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
  color = '#4F46E5',
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
      {/* Indigo coin tile */}
      <rect x="0" y="0" width="32" height="32" rx="9" fill={color} />

      {/* Subtle diagonal highlight for depth */}
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#tf-logo-highlight)" opacity="0.22" />

      {/* Concentric ring motif */}
      <circle cx="16" cy="16" r="9" fill="none" stroke="white" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="4.2" fill="none" stroke="white" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="1.5" fill="white" />

      <defs>
        <linearGradient id="tf-logo-highlight" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
