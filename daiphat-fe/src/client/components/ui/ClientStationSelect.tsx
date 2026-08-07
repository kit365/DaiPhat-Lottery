"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, MapPin } from 'lucide-react';

export type ClientStationOption = {
    id: string;
    label: string;
};

export type ClientStationSelectProps = {
    value: string;
    onChange: (id: string) => void;
    options: ClientStationOption[];
    label?: string;
    /** Show leading "all stations" row. Default true. */
    showAllOption?: boolean;
    allOptionLabel?: string;
    placeholder?: string;
    isLoading?: boolean;
    emptyText?: string;
    error?: boolean;
    className?: string;
    /** Compact trigger for tight headers (e.g. Loto table). */
    size?: 'sm' | 'md';
    onOpen?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

type PanelPos = { top: number; left: number; width: number };

export const ClientStationSelect: React.FC<ClientStationSelectProps> = ({
    value,
    onChange,
    options,
    label,
    showAllOption = true,
    allOptionLabel = 'Tất cả đài',
    placeholder = 'Chọn đài',
    isLoading = false,
    emptyText = 'Không có đài trong ngày này',
    error,
    className = '',
    size = 'md',
    onOpen,
    open: controlledOpen,
    onOpenChange,
}) => {
    const isSm = size === 'sm';
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

    const setOpen = (next: boolean) => {
        if (!isControlled) setUncontrolledOpen(next);
        onOpenChange?.(next);
        if (next) onOpen?.();
    };

    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const selectedLabel =
        value === ''
            ? showAllOption
                ? allOptionLabel
                : placeholder
            : options.find((o) => o.id === value)?.label || placeholder;

    const updatePosition = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };

    useLayoutEffect(() => {
        if (!isOpen) return;
        updatePosition();
        const onReposition = () => updatePosition();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const panel =
        mounted &&
        isOpen &&
        createPortal(
            <div
                ref={panelRef}
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    width: Math.max(pos.width, 180),
                    zIndex: 10000,
                }}
                className="bg-white border border-[#E5E8EB] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden"
            >
                <div className="max-h-[200px] overflow-y-auto py-0.5">
                    {showAllOption && (
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-[12.5px] hover:bg-[#F4F6F8] transition-colors ${
                                !value ? 'text-[#ee1314] font-semibold bg-[#FFF4F4]/60' : 'text-[#454F5B]'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <MapPin size={13} className={!value ? 'text-[#ee1314]' : 'text-[#919EAB]'} />
                                {allOptionLabel}
                            </span>
                            {!value && <Check size={13} className="text-[#ee1314]" />}
                        </button>
                    )}

                    {isLoading ? (
                        <div className="p-3 text-center text-[#919EAB] text-[11.5px]">Đang tải đài...</div>
                    ) : options.length === 0 ? (
                        <div className="p-3 text-center text-[#919EAB] text-[11.5px]">{emptyText}</div>
                    ) : (
                        options.map((option) => {
                            const isSelected = value === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id);
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-[12.5px] hover:bg-[#F4F6F8] transition-colors ${
                                        isSelected
                                            ? 'text-[#ee1314] font-semibold bg-[#FFF4F4]/60'
                                            : 'text-[#454F5B]'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        <MapPin
                                            size={13}
                                            className={isSelected ? 'text-[#ee1314]' : 'text-[#919EAB]'}
                                        />
                                        <span className="truncate">{option.label}</span>
                                    </span>
                                    {isSelected && <Check size={13} className="text-[#ee1314] shrink-0" />}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>,
            document.body
        );

    return (
        <div className={`flex flex-col gap-1 relative ${className}`}>
            {label ? <span className="text-[11px] font-semibold text-[#637381]">{label}</span> : null}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(!isOpen)}
                className={`flex items-center justify-between border bg-white font-medium transition-all ${
                    isSm
                        ? 'w-auto min-w-[118px] max-w-[150px] px-2.5 py-1.5 rounded-lg text-[11px] gap-1'
                        : 'w-full px-3 py-2 rounded-xl text-[13px]'
                } ${
                    error
                        ? 'border-red-400 ring-2 ring-red-50'
                        : isOpen
                          ? 'border-[#ee1314] ring-2 ring-[#ee1314]/10'
                          : 'border-[#E5E8EB] hover:border-[#C4CDD5]'
                }`}
            >
                <span className="flex items-center gap-1.5 text-[#212B36] min-w-0">
                    <MapPin size={isSm ? 12 : 15} className="text-[#ee1314] shrink-0" />
                    <span className="truncate">{selectedLabel}</span>
                </span>
                <ChevronDown
                    size={isSm ? 13 : 15}
                    className={`text-[#919EAB] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {panel}
        </div>
    );
};
