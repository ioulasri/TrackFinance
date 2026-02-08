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
        <label className="block mb-1.5 text-gray-900">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
            {icon}
          </div>
        )}
        <input
          className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent 
            transition-all ${icon ? 'pl-10' : ''} ${error ? 'border-red-600' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
