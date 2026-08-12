import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  theme?: 'light' | 'dark';
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '', theme = 'light' }) => {
  const isDark = theme === 'dark';
  
  const containerText = isDark ? 'text-white/80' : 'text-[#637381]';
  const linkHover = isDark ? 'hover:text-white' : 'hover:text-[#ee1314]';
  const activeText = isDark ? 'text-white' : 'text-[#212B36]';

  return (
    <div className={`flex items-center gap-2 text-[13px] ${containerText} mb-2 font-medium ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {item.to && !isLast ? (
              <Link href={item.to} className={`${linkHover} transition-colors`}>
                {item.label}
              </Link>
            ) : (
              <span className={`${activeText} font-medium`}>{item.label}</span>
            )}
            {!isLast && <ChevronRight size={14} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
