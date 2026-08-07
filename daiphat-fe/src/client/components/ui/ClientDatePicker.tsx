"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

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

const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
};

type CalendarCell = { day: number; month: number; year: number };

const generateCalendarDays = (selectedMonth: number, selectedYear: number): CalendarCell[] => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDayIndex = getFirstDayOfMonth(selectedMonth, selectedYear);
    const cells: CalendarCell[] = [];

    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

    for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
        cells.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevYear });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
        cells.push({ day: d, month: selectedMonth, year: selectedYear });
    }

    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    let nextDay = 1;
    while (cells.length % 7 !== 0 || cells.length < 35) {
        cells.push({ day: nextDay, month: nextMonth, year: nextYear });
        nextDay += 1;
        if (cells.length >= 42) break;
    }
    return cells;
};

export type ClientDatePickerProps = {
    value: string;
    onChange: (ymd: string) => void;
    minDate?: string;
    maxDate?: string;
    label?: string;
    error?: boolean;
    className?: string;
    /** Called when this picker opens (so parent can close sibling popovers). */
    onOpen?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

type PanelPos = { top: number; left: number };

export const ClientDatePicker: React.FC<ClientDatePickerProps> = ({
    value,
    onChange,
    minDate,
    maxDate,
    label,
    error,
    className = '',
    onOpen,
    open: controlledOpen,
    onOpenChange,
}) => {
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
    const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0 });
    const [mounted, setMounted] = useState(false);

    const initial = value ? new Date(`${value}T12:00:00`) : new Date();
    const [viewYear, setViewYear] = useState(initial.getFullYear());
    const [viewMonth, setViewMonth] = useState(initial.getMonth());
    const now = new Date();

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!value) return;
        const parts = value.split('-');
        if (parts.length === 3) {
            setViewYear(Number(parts[0]));
            setViewMonth(Number(parts[1]) - 1);
        }
    }, [value]);

    const updatePosition = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const panelWidth = 270;
        let left = rect.left;
        if (left + panelWidth > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - panelWidth - 8);
        }
        setPos({ top: rect.bottom + 4, left });
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

    const isDateAllowed = (ymd: string) => {
        if (minDate && ymd < minDate) return false;
        if (maxDate && ymd > maxDate) return false;
        return true;
    };

    const pickDate = (ymd: string) => {
        if (!isDateAllowed(ymd)) return;
        onChange(ymd);
        setOpen(false);
    };

    const panel =
        mounted &&
        isOpen &&
        createPortal(
            <div
                ref={panelRef}
                style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 10000 }}
                className="bg-white border border-[#E5E8EB] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] w-[270px] p-3"
            >
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <button
                        type="button"
                        onClick={() => {
                            if (viewMonth === 0) {
                                setViewMonth(11);
                                setViewYear((y) => y - 1);
                            } else {
                                setViewMonth((m) => m - 1);
                            }
                        }}
                        className="p-1 rounded-lg hover:bg-[#F4F6F8] text-[#637381] transition-colors"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <span className="text-[12px] font-bold text-[#212B36]">
                        Tháng {viewMonth + 1}, {viewYear}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            if (viewMonth === 11) {
                                setViewMonth(0);
                                setViewYear((y) => y + 1);
                            } else {
                                setViewMonth((m) => m + 1);
                            }
                        }}
                        className="p-1 rounded-lg hover:bg-[#F4F6F8] text-[#637381] transition-colors"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-[#919EAB]">
                    {WEEKDAYS.map((d) => (
                        <div key={d} className="py-0.5">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                    {generateCalendarDays(viewMonth, viewYear).map((cell, idx) => {
                        const ymd = formatDateToYMD(cell.year, cell.month, cell.day);
                        const isSelected = value === ymd;
                        const isCurrentMonth = cell.month === viewMonth;
                        const allowed = isDateAllowed(ymd);
                        const isToday =
                            cell.day === now.getDate() &&
                            cell.month === now.getMonth() &&
                            cell.year === now.getFullYear();

                        return (
                            <button
                                key={idx}
                                type="button"
                                disabled={!allowed}
                                onClick={() => pickDate(ymd)}
                                className={`py-1 rounded-lg font-semibold transition-all ${
                                    isSelected
                                        ? 'bg-[#ee1314] text-white font-bold'
                                        : !allowed
                                          ? 'text-[#C4CDD5] cursor-not-allowed'
                                          : isToday
                                            ? 'text-[#ee1314] font-bold hover:bg-[#FFF4F4]'
                                            : isCurrentMonth
                                              ? 'text-[#212B36] hover:bg-[#F4F6F8]'
                                              : 'text-[#C4CDD5] hover:bg-[#F4F6F8]'
                                }`}
                            >
                                {cell.day}
                            </button>
                        );
                    })}
                </div>

                {minDate && isDateAllowed(minDate) && (
                    <div className="border-t border-[#F4F6F8] mt-2 pt-2 text-center">
                        <button
                            type="button"
                            onClick={() => pickDate(minDate)}
                            className="text-[11.5px] font-bold text-[#ee1314] hover:bg-[#FFF4F4] px-3 py-1 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                            <Calendar size={11} />
                            Ngày bán sớm nhất
                        </button>
                    </div>
                )}
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border bg-white text-[13px] font-medium transition-all ${
                    error
                        ? 'border-red-400 ring-2 ring-red-50'
                        : isOpen
                          ? 'border-[#ee1314] ring-2 ring-[#ee1314]/10'
                          : 'border-[#E5E8EB] hover:border-[#C4CDD5]'
                }`}
            >
                <span className="flex items-center gap-1.5 text-[#212B36]">
                    <Calendar size={15} className="text-[#ee1314] shrink-0" />
                    <span>{formatDateToDMY(value) || 'Chọn ngày'}</span>
                </span>
                <ChevronDown
                    size={15}
                    className={`text-[#919EAB] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {panel}
        </div>
    );
};
