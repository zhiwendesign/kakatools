'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98] shadow-sm hover:shadow',
      secondary: 'bg-white text-secondary border border-border/60 hover:bg-surfaceHighlight hover:border-primary/20 shadow-sm hover:shadow',
      outline: 'bg-white text-secondary border border-border/60 hover:bg-surfaceHighlight hover:text-primary hover:border-primary/30 shadow-sm hover:shadow',
      ghost: 'text-secondary hover:text-primary hover:bg-surfaceHighlight/60',
      danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98] shadow-sm hover:shadow',
      gradient: 'btn-gradient',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="animate-spin">⏳</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

