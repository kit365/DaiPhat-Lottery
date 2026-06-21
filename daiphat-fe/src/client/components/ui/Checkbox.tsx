import React, { forwardRef } from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps & { label?: React.ReactNode }>(({ className, checked, label, ...props }, ref) => {
  return (
    <label className={`flex items-center gap-2 cursor-pointer group w-max ${className || ''}`}>
      <div className={`relative flex items-center justify-center shrink-0`}>
        <input
          ref={ref}
          type="checkbox"
          className="absolute opacity-0 w-0 h-0 cursor-pointer"
          checked={checked}
          {...props}
        />
        <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${checked ? 'bg-[#ee1314] border-[#ee1314] text-white' : 'border-[#C4CDD5] bg-white group-hover:border-[#ee1314]'}`}>
          {checked && <i className="fa-solid fa-check text-[10px]"></i>}
        </div>
      </div>
      {label && <span className="text-[14px] font-medium text-[#212B36]">{label}</span>}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
