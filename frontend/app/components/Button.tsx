import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
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
  const baseStyles = 'rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm',
    secondary: 'border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-sm',
    text: 'text-primary hover:text-primary/80 hover:bg-accent hover:text-accent-foreground active:bg-accent/80'
  };

  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
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
