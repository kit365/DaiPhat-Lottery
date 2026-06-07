import React, { forwardRef } from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, checked, ...props }, ref) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className || ''}`}>
      <input
        ref={ref}
        type="checkbox"
        className="absolute opacity-0 w-0 h-0 cursor-pointer"
        checked={checked}
        {...props}
      />
      <div className={`w-[16px] h-[16px] rounded flex items-center justify-center border transition-all ${checked ? 'bg-[#ee1314] border-[#ee1314]' : 'bg-white border-gray-300'}`}>
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className={`w-3.5 h-3.5 text-white -translate-y-[0.5px] transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
        >
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
