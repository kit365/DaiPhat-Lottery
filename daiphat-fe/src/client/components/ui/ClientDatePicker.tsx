"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from 'lucide-react';

const MONTH_NAMES = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

export const formatDateToYMD = (year: number, month: number, day: number) =>
    `${year}-${pad2(month + 1)}-${pad2(day)}`;

export const formatDateToDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
};

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

export type ClientDatePickerProps = {
    value: string; // YYYY-MM-DD
    onChange: (ymd: string) => void;
    minDate?: string;
    maxDate?: string;
    label?: string;
    placeholder?: string;
    allowClear?: boolean;
    earliestShortcutLabel?: string;
    error?: boolean;
    className?: string;
    onOpen?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

type DropdownType = 'day' | 'month' | 'year' | null;

export const ClientDatePicker: React.FC<ClientDatePickerProps> = ({
    value,
    onChange,
    minDate,
    maxDate,
    label,
    placeholder = 'Chọn ngày',
    allowClear = false,
    earliestShortcutLabel,
    error,
    className = '',
    onOpen,
    open: controlledOpen,
    onOpenChange,
}) => {
    const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);
    const [mounted, setMounted] = useState(false);

    const dayBtnRef = useRef<HTMLButtonElement>(null);
    const monthBtnRef = useRef<HTMLButtonElement>(null);
    const yearBtnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const [pos, setPos] = useState({ top: 0, left: 0, width: 140 });

    const now = new Date();

    const parsed = useMemo(() => {
        if (!value) return { year: null, month: null, day: null };
        const parts = value.split('-');
        if (parts.length === 3) {
            const y = Number(parts[0]);
            const m = Number(parts[1]) - 1;
            const d = Number(parts[2]);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return { year: y, month: m, day: d };
            }
        }
        return { year: null, month: null, day: null };
    }, [value]);

    const [selDay, setSelDay] = useState<number | null>(parsed.day);
    const [selMonth, setSelMonth] = useState<number | null>(parsed.month);
    const [selYear, setSelYear] = useState<number | null>(parsed.year);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        setSelDay(parsed.day);
        setSelMonth(parsed.month);
        setSelYear(parsed.year);
    }, [parsed.day, parsed.month, parsed.year]);

    const maxDaysInCurrentMonth = useMemo(() => {
        const y = selYear ?? now.getFullYear();
        const m = selMonth ?? now.getMonth();
        return getDaysInMonth(m, y);
    }, [selMonth, selYear]);

    const yearsList = useMemo(() => {
        const currentYear = now.getFullYear();
        const startYear = minDate ? Math.min(1920, Number(minDate.split('-')[0]) || 1920) : 1920;
        const endYear = maxDate ? Math.max(currentYear, Number(maxDate.split('-')[0]) || currentYear) : currentYear + 5;
        const years: number[] = [];
        for (let y = endYear; y >= startYear; y -= 1) {
            years.push(y);
        }
        return years;
    }, [minDate, maxDate]);

    const closeDropdown = () => {
        setActiveDropdown(null);
        onOpenChange?.(false);
    };

    const commitDate = (newDay: number | null, newMonth: number | null, newYear: number | null) => {
        setSelDay(newDay);
        setSelMonth(newMonth);
        setSelYear(newYear);

        if (newDay !== null && newMonth !== null && newYear !== null) {
            const maxD = getDaysInMonth(newMonth, newYear);
            const validDay = Math.min(newDay, maxD);
            const ymd = formatDateToYMD(newYear, newMonth, validDay);
            onChange(ymd);
        }
    };

    const updatePosition = () => {
        let triggerEl: HTMLButtonElement | null = null;

        if (activeDropdown === 'day') triggerEl = dayBtnRef.current;
        else if (activeDropdown === 'month') triggerEl = monthBtnRef.current;
        else if (activeDropdown === 'year') triggerEl = yearBtnRef.current;

        if (!triggerEl) return;
        const rect = triggerEl.getBoundingClientRect();
        const panelHeight = 220;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < panelHeight + 12 && rect.top > panelHeight + 12;

        setPos({
            top: openUp ? rect.top - 6 - panelHeight : rect.bottom + 6,
            left: rect.left,
            width: Math.max(rect.width, 130),
        });
    };

    useLayoutEffect(() => {
        if (!activeDropdown) return;
        updatePosition();
        const onReposition = () => updatePosition();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [activeDropdown]);

    useEffect(() => {
        if (!activeDropdown) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dayBtnRef.current?.contains(target)) return;
            if (monthBtnRef.current?.contains(target)) return;
            if (yearBtnRef.current?.contains(target)) return;
            if (panelRef.current?.contains(target)) return;
            closeDropdown();
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeDropdown();
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [activeDropdown]);

    const openMenu = (type: DropdownType) => {
        if (activeDropdown === type) {
            closeDropdown();
        } else {
            setActiveDropdown(type);
            onOpenChange?.(true);
            onOpen?.();
        }
    };

    // Auto-scroll selected item into view in popover panel
    useEffect(() => {
        if (!activeDropdown || !panelRef.current) return;
        const selectedBtn = panelRef.current.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
        if (selectedBtn) {
            selectedBtn.scrollIntoView({ block: 'nearest' });
        }
    }, [activeDropdown]);

    const portalContent =
        mounted && activeDropdown ? (
            createPortal(
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        width: pos.width,
                        zIndex: 10000,
                    }}
                    className="client-portal bg-white border border-[#E5E8EB] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] overflow-y-auto max-h-[220px] py-1 custom-scrollbar"
                >
                    {/* DANH SÁCH XỔ XUỐNG CHỌN NGÀY */}
                    {activeDropdown === 'day' &&
                        Array.from({ length: maxDaysInCurrentMonth }, (_, i) => i + 1).map((d) => {
                            const isSelected = selDay === d;
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                        const nextYear = selYear ?? now.getFullYear();
                                        const nextMonth = selMonth ?? now.getMonth();
                                        commitDate(d, nextMonth, nextYear);
                                        closeDropdown();
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-[14px] transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#FFF4F4] text-[#ee1314] font-semibold'
                                            : 'text-[#212B36] hover:bg-[#F4F6F8]'
                                    }`}
                                >
                                    <span>Ngày {pad2(d)}</span>
                                    {isSelected && <Check size={14} className="text-[#ee1314] shrink-0" />}
                                </button>
                            );
                        })}

                    {/* DANH SÁCH XỔ XUỐNG CHỌN THÁNG */}
                    {activeDropdown === 'month' &&
                        MONTH_NAMES.map((name, idx) => {
                            const isSelected = selMonth === idx;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                        const nextDay = selDay ?? 1;
                                        const nextYear = selYear ?? now.getFullYear();
                                        commitDate(nextDay, idx, nextYear);
                                        closeDropdown();
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-[14px] transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#FFF4F4] text-[#ee1314] font-semibold'
                                            : 'text-[#212B36] hover:bg-[#F4F6F8]'
                                    }`}
                                >
                                    <span>{name}</span>
                                    {isSelected && <Check size={14} className="text-[#ee1314] shrink-0" />}
                                </button>
                            );
                        })}

                    {/* DANH SÁCH XỔ XUỐNG CHỌN NĂM */}
                    {activeDropdown === 'year' &&
                        yearsList.map((y) => {
                            const isSelected = selYear === y;
                            return (
                                <button
                                    key={y}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                        const nextDay = selDay ?? 1;
                                        const nextMonth = selMonth ?? 0;
                                        commitDate(nextDay, nextMonth, y);
                                        closeDropdown();
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-[14px] transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#FFF4F4] text-[#ee1314] font-semibold'
                                            : 'text-[#212B36] hover:bg-[#F4F6F8]'
                                    }`}
                                >
                                    <span>Năm {y}</span>
                                    {isSelected && <Check size={14} className="text-[#ee1314] shrink-0" />}
                                </button>
                            );
                        })}
                </div>,
                document.body
            )
        ) : null;

    return (
        <div className={`flex flex-col gap-1 relative ${className}`}>
            {label ? <span className="text-[13px] font-semibold text-[#637381]">{label}</span> : null}

            <div className="grid grid-cols-3 gap-2 w-full">
                {/* 1. NÚT CHỌN NGÀY */}
                <button
                    ref={dayBtnRef}
                    type="button"
                    onClick={() => openMenu('day')}
                    className={`h-[46px] px-3.5 bg-white border rounded-xl font-medium text-[14px] flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-[0_2px_8px_rgb(0,0,0,0.02)] ${
                        error
                            ? 'border-red-400 ring-2 ring-red-50'
                            : activeDropdown === 'day'
                              ? 'border-[#ee1314] ring-2 ring-[#ee1314]/10'
                              : 'border-[#E5E8EB] hover:border-[#C4CDD5]'
                    }`}
                >
                    <span className={`truncate text-left ${selDay !== null ? 'text-[#212B36] font-semibold' : 'text-[#919EAB]'}`}>
                        {selDay !== null ? `Ngày ${pad2(selDay)}` : 'Chọn ngày'}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`text-[#919EAB] shrink-0 transition-transform ${activeDropdown === 'day' ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* 2. NÚT CHỌN THÁNG */}
                <button
                    ref={monthBtnRef}
                    type="button"
                    onClick={() => openMenu('month')}
                    className={`h-[46px] px-3.5 bg-white border rounded-xl font-medium text-[14px] flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-[0_2px_8px_rgb(0,0,0,0.02)] ${
                        error
                            ? 'border-red-400 ring-2 ring-red-50'
                            : activeDropdown === 'month'
                              ? 'border-[#ee1314] ring-2 ring-[#ee1314]/10'
                              : 'border-[#E5E8EB] hover:border-[#C4CDD5]'
                    }`}
                >
                    <span className={`truncate text-left ${selMonth !== null ? 'text-[#212B36] font-semibold' : 'text-[#919EAB]'}`}>
                        {selMonth !== null ? MONTH_NAMES[selMonth] : 'Chọn tháng'}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`text-[#919EAB] shrink-0 transition-transform ${activeDropdown === 'month' ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* 3. NÚT CHỌN NĂM */}
                <button
                    ref={yearBtnRef}
                    type="button"
                    onClick={() => openMenu('year')}
                    className={`h-[46px] px-3.5 bg-white border rounded-xl font-medium text-[14px] flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-[0_2px_8px_rgb(0,0,0,0.02)] ${
                        error
                            ? 'border-red-400 ring-2 ring-red-50'
                            : activeDropdown === 'year'
                              ? 'border-[#ee1314] ring-2 ring-[#ee1314]/10'
                              : 'border-[#E5E8EB] hover:border-[#C4CDD5]'
                    }`}
                >
                    <span className={`truncate text-left ${selYear !== null ? 'text-[#212B36] font-semibold' : 'text-[#919EAB]'}`}>
                        {selYear !== null ? `Năm ${selYear}` : 'Chọn năm'}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`text-[#919EAB] shrink-0 transition-transform ${activeDropdown === 'year' ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {allowClear && (selDay !== null || selMonth !== null || selYear !== null) && (
                <div className="flex justify-end mt-0.5">
                    <button
                        type="button"
                        onClick={() => {
                            setSelDay(null);
                            setSelMonth(null);
                            setSelYear(null);
                            onChange('');
                            closeDropdown();
                        }}
                        className="text-[11px] text-[#919EAB] hover:text-[#ee1314] inline-flex items-center gap-1 font-medium transition-colors"
                    >
                        <X size={12} />
                        Xóa đã chọn
                    </button>
                </div>
            )}

            {portalContent}
        </div>
    );
};
