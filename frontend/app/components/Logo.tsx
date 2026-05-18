/**
 * TrackFinance logo.
 *
 * A rounded "coin" tile with a stylized line that rises diagonally to a small
 * filled tracking marker at the apex. Reads as tracking + growth + money.
 *
 * Usage:
 *   <Logo />                       // 32px mark + wordmark
 *   <Logo size="sm" />             // 24px
 *   <Logo size="lg" showWordmark={false} />  // mark only, 48px
 */

import React from 'react';

interface LogoProps {
  /** Mark size; wordmark scales with it. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Render the "TrackFinance" wordmark beside the mark. Default true. */
  showWordmark?: boolean;
  /** Override the mark color (defaults to the theme's primary). */
  tone?: 'primary' | 'white' | 'foreground';
  className?: string;
}

const MARK_SIZES = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
} as const;

const WORDMARK_SIZES = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl',
} as const;

export function Logo({
  size = 'md',
  showWordmark = true,
  tone = 'primary',
  className = '',
}: LogoProps) {
  const px = MARK_SIZES[size];
  const toneClass =
    tone === 'white'
      ? 'text-white'
      : tone === 'foreground'
      ? 'text-foreground'
      : 'text-primary';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={px} className={toneClass} />
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
  className?: string;
}

/**
 * Just the mark (no wordmark). Inline SVG, currentColor-aware so it tints
 * with text utilities. 32x32 viewBox; stroke-based so it scales crisply.
 */
export function LogoMark({ size = 32, className = '' }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TrackFinance"
      role="img"
    >
      {/* Coin tile — filled rounded square in currentColor */}
      <rect x="0" y="0" width="32" height="32" rx="8" fill="currentColor" />

      {/* Inner highlight (very subtle, for depth) */}
      <rect
        x="0"
        y="0"
        width="32"
        height="32"
        rx="8"
        fill="url(#logo-highlight)"
        opacity="0.18"
      />

      {/* Rising tracking line */}
      <path
        d="M7 22 L13 16 L17 19 L24 10"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Apex marker — small white dot ringed by emerald */}
      <circle cx="24" cy="10" r="2.6" fill="white" />
      <circle cx="24" cy="10" r="1.2" fill="currentColor" />

      <defs>
        <linearGradient id="logo-highlight" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
