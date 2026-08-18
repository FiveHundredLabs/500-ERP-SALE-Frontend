import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  fullWidth = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium transition-all duration-200 flex items-center justify-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm',
    secondary: 'bg-[#334155] hover:bg-[#475569] text-gray-200 focus:ring-[#475569]',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm',
    ghost: 'bg-transparent border border-[#334155] text-gray-300 hover:bg-[#334155]/30 hover:text-gray-200 focus:ring-[#475569]'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && icon
      )}
      {children}
    </button>
  );
};

export default Button;
