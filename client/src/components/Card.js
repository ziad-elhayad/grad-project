import React from 'react';

/**
 * Reusable Card component with consistent dark mode styling
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.hover - Enable hover effect
 * @param {boolean} props.padding - Enable padding (default: true)
 * @param {string} props.paddingSize - Padding size: 'sm', 'md', 'lg' (default: 'md')
 */
const Card = ({ 
  children, 
  className = '', 
  hover = false,
  padding = true,
  paddingSize = 'md'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const baseClasses = `
    bg-white 
    dark:bg-slate-800 
    border border-gray-200 
    dark:border-slate-700 
    rounded-2xl 
    shadow-sm 
    dark:shadow-none 
    transition-all duration-300
    ${padding ? paddingClasses[paddingSize] : ''}
    ${hover ? 'hover:shadow-md dark:hover:bg-slate-700/60 cursor-pointer' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
};

export default Card;

