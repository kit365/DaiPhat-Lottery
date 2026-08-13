"use client";

import React, { useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AppToast as toast } from '../../../../utils/toast.util';
import { todayIsoVn, tomorrowIsoVn } from '../../../utils/sellableDrawDate.util';
import { formatVietnameseDrawDateWithParen } from '../../../utils/vietnameseDate.util';

export type BuyTicketProvinceOption = {
    id: string;
    name: string;
    time: string;
    icon?: string;
};

type BuyTicketDateStationSelectorsProps = {
    selectedDates: string[];
    onChangeDates: (next: string[]) => void;
    todaySellClosed: boolean;
    effectiveDrawTime: string;
    selectedProvinces: string[];
    onChangeProvinces: (next: string[]) => void;
    provinces: BuyTicketProvinceOption[];
    allProvinceIds: string[];
    isAllProvincesSelected: boolean;
    isLoadingProvinces: boolean;
    isProvinceOpen: boolean;
    onProvinceOpenChange: (open: boolean) => void;
};

const sameProvinceId = (left: string | number, right: string | number) =>
    String(left) === String(right);

const DatePill = ({
    active,
    disabled,
    title,
    subtitle,
    onClick,
}: {
    active: boolean;
    disabled?: boolean;
    title: string;
    subtitle: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`flex-1 min-w-0 rounded-xl px-3 py-2.5 text-left transition-all border ${
            disabled
                ? 'opacity-50 cursor-not-allowed border-[#E5E8EB] bg-[#F9FAFB]'
                : active
                  ? 'border-[#ee1314] bg-[#ee1314] text-white shadow-sm shadow-[#ee1314]/20'
                  : 'border-[#E5E8EB] bg-white hover:border-[#ee1314]/40 hover:bg-[#FFF4F4]'
        }`}
    >
        <div className={`font-bold text-[14px] leading-tight ${active && !disabled ? 'text-white' : 'text-[#212B36]'}`}>
            {title}
        </div>
        <div className={`text-[12px] mt-0.5 truncate ${active && !disabled ? 'text-white/85' : 'text-[#637381]'}`}>
            {subtitle}
        </div>
    </button>
);

const SelectionCheck = ({ checked }: { checked: boolean }) =>
    checked ? (
        <span className="w-5 h-5 rounded-full bg-[#ee1314] text-white flex items-center justify-center shrink-0">
            <Check size={12} strokeWidth={3} />
        </span>
    ) : (
        <span className="w-5 h-5 rounded-full border-2 border-[#C4CDD5] bg-white shrink-0" />
    );

export const BuyTicketDateStationSelectors = ({
    selectedDates,
    onChangeDates,
    todaySellClosed,
    effectiveDrawTime,
    selectedProvinces,
    onChangeProvinces,
    provinces,
    allProvinceIds,
    isAllProvincesSelected,
    isLoadingProvinces,
    isProvinceOpen,
    onProvinceOpenChange,
}: BuyTicketDateStationSelectorsProps) => {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isProvinceOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                onProvinceOpenChange(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProvinceOpen, onProvinceOpenChange]);

    const activeProvinces = provinces.filter((province) =>
        selectedProvinces.some((id) => sameProvinceId(id, province.id))
    );

    const stationTitle = isAllProvincesSelected
        ? 'Tất cả đài miền Nam'
        : activeProvinces.length > 1
          ? `Đã chọn ${activeProvinces.length} đài`
          : activeProvinces.length === 1
            ? activeProvinces[0].name || 'Đang tải đài...'
            : 'Vui lòng chọn đài';

    const stationSubtitle = isAllProvincesSelected
        ? `${provinces.length} đài`
        : activeProvinces.length === 1
          ? activeProvinces[0].time || '---'
          : activeProvinces.length > 1
            ? activeProvinces.map((p) => p.name).join(', ')
            : '---';

    const subsetCount =
        !isAllProvincesSelected && activeProvinces.length > 0 ? activeProvinces.length : 0;

    const toggleToday = () => {
        if (todaySellClosed) {
            toast.info(`Đã qua giờ xổ (${effectiveDrawTime}). Chỉ còn bán vé ngày mai.`);
            return;
        }
        if (selectedDates.includes('today') && selectedDates.length === 1) return;
        if (selectedDates.includes('today')) {
            onChangeDates(selectedDates.filter((d) => d !== 'today'));
        } else {
            onChangeDates([...selectedDates.filter((d) => d === 'tomorrow'), 'today']);
        }
    };

    const toggleTomorrow = () => {
        if (selectedDates.includes('tomorrow') && selectedDates.length === 1) return;
        if (selectedDates.includes('tomorrow')) {
            onChangeDates(selectedDates.filter((d) => d !== 'tomorrow'));
        } else {
            onChangeDates([
                ...(todaySellClosed ? [] : selectedDates.filter((d) => d === 'today')),
                'tomorrow',
            ]);
        }
    };

    const toggleProvince = (provId: string) => {
        if (isAllProvincesSelected) {
            // Bỏ tích 1 đài → còn lại các đài khác
            onChangeProvinces(allProvinceIds.filter((id) => !sameProvinceId(id, provId)));
            return;
        }
        const isSelected = selectedProvinces.some((id) => sameProvinceId(id, provId));
        if (isSelected) {
            const next = selectedProvinces.filter((p) => !sameProvinceId(p, provId));
            onChangeProvinces(next.length === 0 ? allProvinceIds : next);
        } else {
            const next = [...selectedProvinces, provId];
            const selectedAll =
                allProvinceIds.length > 0 &&
                allProvinceIds.every((id) => next.some((n) => sameProvinceId(n, id)));
            onChangeProvinces(selectedAll ? allProvinceIds : next);
        }
    };

    return (
        <div
            ref={rootRef}
            className={`bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] mb-5 shrink-0 ${
                isProvinceOpen ? 'relative z-50' : ''
            }`}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 md:items-stretch">
                {/* Ngày — pills */}
                <div className="p-3 md:border-r border-[#E5E8EB]">
                    <div className="flex gap-2">
                        <DatePill
                            active={selectedDates.includes('today')}
                            disabled={todaySellClosed}
                            title="Hôm nay"
                            subtitle={formatVietnameseDrawDateWithParen(todayIsoVn())}
                            onClick={toggleToday}
                        />
                        <DatePill
                            active={selectedDates.includes('tomorrow')}
                            title="Ngày mai"
                            subtitle={formatVietnameseDrawDateWithParen(tomorrowIsoVn())}
                            onClick={toggleTomorrow}
                        />
                    </div>
                </div>

                {/* Chọn đài — trigger + popover */}
                <div className="relative p-3 flex flex-col justify-center">
                    <button
                        type="button"
                        className="w-full flex gap-2.5 items-center text-left rounded-lg hover:bg-gray-50 transition-colors"
                        onClick={() => onProvinceOpenChange(!isProvinceOpen)}
                        aria-expanded={isProvinceOpen}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="text-[12px] text-[#637381] font-bold uppercase tracking-wider">
                                Chọn đài
                            </div>
                            <div className="flex items-center gap-2 min-w-0 mt-0.5">
                                <span className="font-bold text-[15px] text-[#212B36] truncate leading-tight">
                                    {stationTitle}
                                </span>
                                {subsetCount > 0 && (
                                    <span className="shrink-0 min-w-[20px] h-[20px] px-1 rounded-full bg-[#ee1314] text-white text-[11px] font-bold flex items-center justify-center">
                                        {subsetCount}
                                    </span>
                                )}
                            </div>
                            <div className="text-[13px] text-[#637381] truncate leading-tight">{stationSubtitle}</div>
                        </div>
                        <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                isProvinceOpen
                                    ? 'border border-[#ee1314] text-[#ee1314] bg-[#FFF4F4]'
                                    : 'text-[#637381]'
                            }`}
                        >
                            <ChevronDown
                                size={16}
                                className={`transition-transform ${isProvinceOpen ? 'rotate-180' : ''}`}
                            />
                        </span>
                    </button>

                    {isProvinceOpen && (
                        <div
                            className="absolute top-full left-2 right-2 mt-1.5 bg-white border border-[#E5E8EB] shadow-[0_16px_48px_rgba(33,43,54,0.16)] rounded-xl z-50 overflow-hidden"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="px-3 py-2 border-b border-[#F4F6F8]">
                                <div className="text-[13px] text-[#637381]">
                                    {isAllProvincesSelected
                                        ? `Đã chọn tất cả (${provinces.length})`
                                        : `Đã chọn ${activeProvinces.length}/${provinces.length}`}
                                </div>
                            </div>

                            <div className="p-1 max-h-[min(50vh,280px)] overflow-y-auto">
                                {isLoadingProvinces ? (
                                    <div className="p-3 text-center text-[#637381] text-[14px]">Đang tải...</div>
                                ) : provinces.length === 0 ? (
                                    <div className="p-3 text-center text-[#637381] text-[14px]">Không có đài</div>
                                ) : (
                                    <div className="flex flex-col">
                                        {provinces.map((prov) => {
                                            const isProvSelected =
                                                isAllProvincesSelected ||
                                                selectedProvinces.some((id) =>
                                                    sameProvinceId(id, prov.id)
                                                );
                                            return (
                                                <button
                                                    key={prov.id}
                                                    type="button"
                                                    className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-left transition-colors ${
                                                        isProvSelected
                                                            ? 'bg-[#FFF4F4]'
                                                            : 'hover:bg-gray-50'
                                                    }`}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleProvince(String(prov.id));
                                                    }}
                                                >
                                                    <SelectionCheck checked={isProvSelected} />
                                                    <span
                                                        className={`font-bold text-[14px] truncate ${
                                                            isProvSelected ? 'text-[#ee1314]' : 'text-[#212B36]'
                                                        }`}
                                                    >
                                                        {prov.name}
                                                        {prov.time ? (
                                                            <span
                                                                className={`font-medium ${
                                                                    isProvSelected
                                                                        ? 'text-[#ee1314]/80'
                                                                        : 'text-[#637381]'
                                                                }`}
                                                            >
                                                                {' · '}
                                                                {prov.time}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {todaySellClosed && (
                <div className="px-3 py-2 border-t border-[#FFE4E4] bg-[#FFF4F4] rounded-b-[20px]">
                    <p className="text-[14px] text-[#ee1314] leading-snug text-center">
                        Đã hết giờ bán hôm nay (sau {effectiveDrawTime}). Chỉ còn vé ngày mai.
                    </p>
                </div>
            )}
        </div>
    );
};
