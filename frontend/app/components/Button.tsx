import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium ' +
    'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

  const variantStyles = {
    // Filled emerald primary with subtle shadow + crisp hover state
    primary:
      'bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(15,30,26,0.12)] ' +
      'hover:bg-emerald-700 active:scale-[0.98]',
    // Quiet outlined button, emerald accents on hover
    secondary:
      'border border-border bg-card text-foreground ' +
      'hover:bg-primary/5 hover:border-primary/30 hover:text-foreground active:scale-[0.98]',
    danger:
      'bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgba(220,38,38,0.25)] ' +
      'hover:bg-red-700 active:scale-[0.98]',
    text: 'text-primary hover:text-emerald-700 hover:bg-primary/5',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  };

  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
