"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type ClientSelectOption = {
    value: string;
    label: string;
};

type PanelPos = { top: number; left: number; width: number };

export type ClientSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: ClientSelectOption[];
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    triggerClassName?: string;
};

export const ClientSelect: React.FC<ClientSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Chọn',
    label,
    disabled = false,
    size = 'md',
    className = '',
    triggerClassName = '',
}) => {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((option) => option.value === value);
    const selectedLabel = selectedOption?.label || placeholder;
    const hasValue = Boolean(selectedOption);

    useEffect(() => setMounted(true), []);

    const updatePosition = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const panelHeight = panelRef.current?.offsetHeight ?? 220;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < panelHeight + 12 && rect.top > panelHeight + 12;

        setPos({
            top: openUp ? rect.top - 6 - panelHeight : rect.bottom + 6,
            left: rect.left,
            width: size === 'sm' ? rect.width : Math.max(rect.width, 200),
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
        const raf = requestAnimationFrame(updatePosition);
        const onReposition = () => updatePosition();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [open, options.length]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const panel =
        mounted && open
            ? createPortal(
                  <div
                      ref={panelRef}
                      style={{
                          position: 'fixed',
                          top: pos.top,
                          left: pos.left,
                          width: pos.width,
                          zIndex: 10000,
                      }}
                      className="bg-white border border-[#E5E8EB] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden py-1"
                  >
                      {options.map((option) => {
                          const isSelected = option.value === value;
                          return (
                              <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                      onChange(option.value);
                                      setOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors ${
                                      isSelected
                                          ? 'bg-[#FFF4F4] text-[#ee1314] font-semibold'
                                          : 'text-[#212B36] hover:bg-[#F4F6F8]'
                                  }`}
                              >
                                  <span>{option.label}</span>
                                  {isSelected && <Check size={15} className="text-[#ee1314] shrink-0" />}
                              </button>
                          );
                      })}
                  </div>,
                  document.body,
              )
            : null;

    const isSm = size === 'sm';

    return (
        <div className={`relative ${label ? 'flex flex-col gap-1' : ''} ${className}`}>
            {label ? <span className="text-[13px] font-semibold text-[#637381]">{label}</span> : null}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    setOpen((prev) => !prev);
                }}
                className={`w-full bg-white border rounded-xl font-medium text-[#212B36] flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSm
                        ? 'h-9 min-w-[72px] px-2.5 text-[14px]'
                        : 'h-[46px] px-4 text-[14px] shadow-[0_2px_8px_rgb(0,0,0,0.02)]'
                } ${
                    disabled
                        ? 'opacity-50 cursor-not-allowed border-[#E5E8EB]'
                        : open
                          ? 'border-[#ee1314] ring-2 ring-[#ee1314]/10'
                          : 'border-[#E5E8EB] hover:border-[#C4CDD5]'
                } ${triggerClassName}`}
                aria-expanded={open}
            >
                <span className={`truncate text-left ${hasValue ? 'text-[#212B36]' : 'text-[#919EAB]'}`}>{selectedLabel}</span>
                <ChevronDown
                    size={16}
                    className={`text-[#919EAB] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {panel}
        </div>
    );
};
