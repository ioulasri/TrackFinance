import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 py-3 bg-muted/30 border border-border/80 rounded-xl text-foreground placeholder-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-muted/50
            hover:border-primary/30 transition-all ${icon ? 'pl-11' : ''} ${error ? 'border-destructive focus:border-destructive focus:ring-destructive/50' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
