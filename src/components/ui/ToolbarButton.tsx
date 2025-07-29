import React from 'react';
import { motion } from 'framer-motion';

interface ToolbarButtonProps {
  icon: any;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  badge?: string | number;
  children?: React.ReactNode;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  icon: Icon, 
  label, 
  isActive = false, 
  onClick, 
  disabled = false,
  variant = 'default',
  size = 'sm',
  className = '',
  badge,
  children
}) => {
  const baseClasses = "relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
  
  const variantClasses = {
    default: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md border border-primary/20",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md border border-green-400/20",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow-md border border-amber-400/20",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md border border-red-400/20",
    ghost: "text-gray-800 hover:bg-gray-200 hover:text-gray-900 transition-colors",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
  };

  const sizeClasses = {
    xs: 'h-7 px-2 text-xs rounded-md',
    sm: 'h-8 px-3 text-sm rounded-lg',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-xl'
  };

  const activeClasses = isActive ? 
    "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-[0.98]" : 
    variantClasses[variant];

  // Enhanced click handler with proper event handling
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔘 Toolbar button clicked:', label);
    
    if (!disabled) {
      try {
        onClick();
      } catch (error) {
        console.error('❌ Error in toolbar button onClick:', error);
      }
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onMouseDown={(e) => {
        // Prevent default mousedown behavior that might cause scrolling
        e.preventDefault();
      }}
      disabled={disabled}
      title={label}
      type="button"
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${activeClasses}
        ${className}
      `}
    >
      <Icon className={`${size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'} ${children ? 'mr-1.5' : ''}`} />
      {children && <span className="hidden sm:inline">{children}</span>}
      {badge && (
        <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </motion.button>
  );
};

export default ToolbarButton;