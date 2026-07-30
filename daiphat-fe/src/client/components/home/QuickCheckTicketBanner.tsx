import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    MapPin, 
    Ticket, 
    ChevronDown, 
    Check 
} from 'lucide-react';
import { lotteryStationService } from '../../services/lotteryStationService';
import { LotteryStationDraw } from '../../types/lottery';
import { useCheckWinning } from '../../hooks/useLottery';

interface QuickCheckTicketBannerProps {
    availableDates?: string[];
}

type FieldErrors = {
    date?: string;
    station?: string;
    number?: string;
};

export const QuickCheckTicketBanner: React.FC<QuickCheckTicketBannerProps> = ({ availableDates = [] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Convert DD/MM/YYYY to YYYY-MM-DD for native date input
    const toDateInputValue = (dateStr?: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return '';
    };

    // Convert YYYY-MM-DD to DD/MM/YYYY
    const fromDateInputValue = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return '';
    };

    const getDefaultDate = () => {
        if (availableDates.length === 0) return new Date().toISOString().split('T')[0];
        
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Lottery results are usually available after 16:40
        const isBeforeResults = hours < 16 || (hours === 16 && minutes < 40);
        
        if (isBeforeResults && availableDates.length > 1) {
            return toDateInputValue(availableDates[1]); // Yesterday
        }
        
        return toDateInputValue(availableDates[0]); // Today
    };

    const [selectedDate, setSelectedDate] = useState<string>(getDefaultDate());
    const [stations, setStations] = useState<LotteryStationDraw[]>([]);
    const [selectedStationId, setSelectedStationId] = useState<number | ''>('');
    const [selectedStationName, setSelectedStationName] = useState<string>('');
    const [ticketNumber, setTicketNumber] = useState<string>('');
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    
    // Custom drop-down states
    const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    // Date navigation state for custom calendar
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

    const stationDropdownRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const ticketNumberInputRef = useRef<HTMLInputElement>(null);

    const { 
        check, 
        reset, 
        isChecking, 
        hasChecked, 
        checkResult, 
        errorMessage, 
        setErrorMessage 
    } = useCheckWinning();

    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (stationDropdownRef.current && !stationDropdownRef.current.contains(event.target as Node)) {
                setIsStationDropdownOpen(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Sync year and month of calendar with selectedDate
    useEffect(() => {
        if (selectedDate) {
            const parts = selectedDate.split('-');
            if (parts.length === 3) {
                setSelectedYear(Number(parts[0]));
                setSelectedMonth(Number(parts[1]) - 1);
            }
        }
    }, [selectedDate]);

    // Fetch stations when selectedDate changes
    useEffect(() => {
        if (!selectedDate) return;

        const fetchStations = async () => {
            setIsLoadingProvinces(true);
            try {
                const displayDate = fromDateInputValue(selectedDate);
                const stationList = await lotteryStationService.getScheduleForDate(displayDate);
                setStations(stationList);
                setSelectedStationId('');
            } catch (error) {
                console.error("Failed to fetch stations", error);
                setStations([]);
                setSelectedStationId('');
            } finally {
                setIsLoadingProvinces(false);
            }
        };

        fetchStations();
    }, [selectedDate]);

    // Sync station name when selectedStationId or stations changes
    useEffect(() => {
        if (selectedStationId && stations.length > 0) {
            const matched = stations.find(s => s.id === selectedStationId);
            if (matched) {
                setSelectedStationName(matched.province);
            }
        } else {
            setSelectedStationName('');
        }
    }, [selectedStationId, stations]);

    const handleCheck = async () => {
        setFieldErrors({});
        setErrorMessage(null);

        if (!selectedDate) {
            setFieldErrors({ date: 'Vui lòng chọn ngày quay.' });
            setIsStationDropdownOpen(false);
            setIsDatePickerOpen(true);
            return;
        }

        if (!selectedStationId) {
            setFieldErrors({ station: 'Vui lòng chọn đài quay.' });
            setIsDatePickerOpen(false);
            setIsStationDropdownOpen(true);
            return;
        }

        const trimmedNumber = ticketNumber.trim();
        if (!trimmedNumber) {
            setFieldErrors({ number: 'Vui lòng nhập dãy số trên vé.' });
            ticketNumberInputRef.current?.focus();
            return;
        }

        if (trimmedNumber.length < 5) {
            setFieldErrors({ number: 'Vui lòng nhập đúng 5 hoặc 6 chữ số trên vé.' });
            ticketNumberInputRef.current?.focus();
            return;
        }

        try {
            const displayDate = fromDateInputValue(selectedDate);
            await check(
                Number(selectedStationId),
                displayDate,
                trimmedNumber
            );
        } catch {
            // Error is already handled by the hook
        }
    };

    const handleReset = () => {
        reset();
        setTicketNumber('');
        setFieldErrors({});
    };

    // Calendar utility functions
    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust to Monday start
    };

    const formatDateToYMD = (year: number, month: number, day: number) => {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    };

    const formatDateToDMY = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
        const firstDayIndex = getFirstDayOfMonth(selectedMonth, selectedYear);

        const days = [];

        // Previous month's trailing days
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        const prevMonthDays = getDaysInMonth(prevMonth, prevYear);

        for (let i = firstDayIndex - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                month: prevMonth,
                year: prevYear
            });
        }

        // Current month's days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                month: selectedMonth,
                year: selectedYear
            });
        }

        // Next month's leading days
        const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
        const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
        const remainingCells = 42 - days.length;

        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                day: i,
                month: nextMonth,
                year: nextYear
            });
        }

        return days;
    };

    const modalContent = (
        <AnimatePresence>
        {isExpanded && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                {/* Backdrop overlay */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsExpanded(false)}
                    className="absolute inset-0 bg-black/60"
                />
                
                {/* Modal card container */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="relative w-full max-w-[480px] bg-white rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.25)] p-5 md:p-6 overflow-visible z-10"
                >
                    {/* Red Circle Close Button */}
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-[#ee1314] flex items-center justify-center transition-colors border-none cursor-pointer"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>

                    {/* Title & Subtitle */}
                    <h2 className="text-[#ee1314] font-black text-xl md:text-2xl text-center uppercase tracking-wide">
                        TRA CỨU VÉ SỐ
                    </h2>
                    <p className="text-[13px] text-slate-500 text-center mt-1 mb-5">
                        Nhập thông tin vé để kiểm tra kết quả nhanh chóng
                    </p>
                    
                    <div className="flex flex-col gap-4">
                        {isChecking && (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="w-8 h-8 border-3 border-t-[#ee1314] border-slate-200 rounded-full animate-spin"></div>
                                <p className="text-[13px] text-slate-500 font-medium">Đang dò kết quả...</p>
                            </div>
                        )}

                        {!isChecking && errorMessage && (
                            <div className="bg-red-50 border border-red-100/60 rounded-xl p-4 text-center flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-2">
                                    <span className="material-symbols-outlined text-[20px]">error</span>
                                </div>
                                <p className="text-[13px] text-red-600 font-medium leading-relaxed">{errorMessage}</p>
                                <button 
                                    onClick={() => setErrorMessage(null)}
                                    className="mt-3 text-[12px] bg-[#ee1314] text-white px-4 py-1.5 rounded-lg font-bold hover:bg-[#d61112] transition-colors cursor-pointer border-none"
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}

                        {!isChecking && !errorMessage && hasChecked && (
                            <div className="flex flex-col gap-4">
                                {checkResult?.winning ? (
                                    <div className="flex flex-col gap-3">
                                        {/* Winning banner */}
                                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 text-center">
                                            <span className="text-[28px] mb-1 block animate-bounce">🎉</span>
                                            <h4 className="text-[14px] font-bold text-emerald-800">Chúc mừng bạn đã trúng!</h4>
                                            <p className="text-[11px] text-emerald-600 mt-1">Vé số của bạn trùng khớp với kết quả:</p>
                                        </div>
                                        
                                        {/* Prize list */}
                                        <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                                            {checkResult.matchedPrizes.map((prize, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-100 transition-colors">
                                                    <div>
                                                        <div className="text-[12.5px] font-bold text-slate-800">{prize.prizeDisplayName}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                          Số trúng: <span className="font-bold text-[#ee1314]">{prize.winningNumber}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-[13px] font-extrabold text-[#ee1314]">
                                                        {(prize.prizeValue || 0).toLocaleString('vi-VN')}đ
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Total winning amount */}
                                        {checkResult.matchedPrizes.length > 1 && (
                                            <div className="bg-gradient-to-r from-[#ee1314]/5 to-[#ee1314]/10 rounded-xl p-4 flex items-center justify-between border border-[#ee1314]/10">
                                                <span className="text-[12px] font-bold text-slate-700">Tổng giải thưởng:</span>
                                                <span className="text-[14.5px] font-black text-[#ee1314]">
                                                    {(checkResult.totalWinningAmount || 0).toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : !checkResult?.resultAvailable ? (
                                    /* Result not available state */
                                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 text-center flex flex-col items-center gap-2">
                                        <span className="text-[28px] filter grayscale mb-1">⏳</span>
                                        <h4 className="text-[13px] font-bold text-slate-700">Chưa có kết quả</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            Kết quả xổ số đài này ngày {checkResult?.drawDate ? new Date(checkResult.drawDate).toLocaleDateString('vi-VN') : 'đã chọn'} chưa được cập nhật. Vui lòng quay lại sau!
                                        </p>
                                    </div>
                                ) : (
                                    /* Losing state */
                                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 text-center flex flex-col items-center gap-2">
                                        <span className="text-[28px] filter grayscale mb-1">🍀</span>
                                        <h4 className="text-[13px] font-bold text-slate-700">Rất tiếc, chưa trúng giải</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            Vé số của bạn không trùng với giải nào lần này. Chúc bạn may mắn lần sau!
                                        </p>
                                    </div>
                                )}
                                <motion.button 
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleReset}
                                    className="w-full bg-white border border-slate-200 text-slate-600 rounded-xl py-2.5 font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer text-[12px]"
                                >
                                    Dò vé khác
                                </motion.button>
                            </div>
                        )}

                        {!isChecking && !errorMessage && !hasChecked && (
                            <>
                                {/* 2-Column Fields Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-50">
                                    {/* Station Dropdown */}
                                    <div className="flex flex-col gap-1.5 relative">
                                        <label className="text-[12.5px] font-bold text-slate-700">Chọn đài</label>
                                        <div className="relative" ref={stationDropdownRef}>
                                            <button 
                                                onClick={() => {
                                                    setIsDatePickerOpen(false);
                                                    setIsStationDropdownOpen(!isStationDropdownOpen);
                                                    if (fieldErrors.station) {
                                                        setFieldErrors((prev) => ({ ...prev, station: undefined }));
                                                    }
                                                }}
                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border bg-white text-[13px] font-medium transition-all ${
                                                    fieldErrors.station
                                                        ? 'border-red-400 ring-2 ring-red-50'
                                                        : isStationDropdownOpen
                                                            ? 'border-[#ee1314] ring-2 ring-red-50'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 text-slate-800">
                                                    <MapPin size={15} className="text-[#ee1314]" />
                                                    <span>{selectedStationName || 'Chọn đài'}</span>
                                                </div>
                                                <ChevronDown size={15} className={`text-slate-400 transition-transform ${isStationDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Dropdown Options */}
                                            <AnimatePresence>
                                            {isStationDropdownOpen && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 8 }}
                                                    className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden"
                                                >
                                                    <div className="max-h-[180px] overflow-y-auto py-0.5">
                                                        {isLoadingProvinces ? (
                                                            <div className="p-3 text-center text-slate-400 text-[11.5px]">Đang tải đài...</div>
                                                        ) : stations.length === 0 ? (
                                                            <div className="p-3 text-center text-slate-400 text-[11.5px]">Không có đài trong ngày này</div>
                                                        ) : (
                                                            stations.map((station) => {
                                                                const isSelected = selectedStationId === station.id;
                                                                return (
                                                                    <button 
                                                                        key={station.id}
                                                                        onClick={() => {
                                                                            setSelectedStationId(station.id);
                                                                            setSelectedStationName(station.province);
                                                                            setIsStationDropdownOpen(false);
                                                                            setFieldErrors((prev) => ({ ...prev, station: undefined }));
                                                                        }}
                                                                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-[12.5px] hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer ${
                                                                            isSelected ? 'text-[#ee1314] font-semibold bg-red-50/30' : 'text-slate-700'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-1.5">
                                                                            <MapPin size={13} className={isSelected ? 'text-[#ee1314]' : 'text-slate-400'} />
                                                                            <span>{station.province}</span>
                                                                        </div>
                                                                        {isSelected && <Check size={13} className="text-[#ee1314]" />}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                            </AnimatePresence>
                                        </div>
                                        {fieldErrors.station && (
                                            <span className="text-[11px] text-red-500 font-medium">{fieldErrors.station}</span>
                                        )}
                                    </div>

                                    {/* Datepicker Select */}
                                    <div className="flex flex-col gap-1.5 relative">
                                        <label className="text-[12.5px] font-bold text-slate-700">Chọn ngày</label>
                                        <div className="relative" ref={datePickerRef}>
                                            <button 
                                                onClick={() => {
                                                    setIsStationDropdownOpen(false);
                                                    setIsDatePickerOpen(!isDatePickerOpen);
                                                    if (fieldErrors.date) {
                                                        setFieldErrors((prev) => ({ ...prev, date: undefined }));
                                                    }
                                                }}
                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border bg-white text-[13px] font-medium transition-all ${
                                                    fieldErrors.date
                                                        ? 'border-red-400 ring-2 ring-red-50'
                                                        : isDatePickerOpen
                                                            ? 'border-[#ee1314] ring-2 ring-red-50'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 text-slate-800">
                                                    <Calendar size={15} className="text-[#ee1314]" />
                                                    <span>{formatDateToDMY(selectedDate)}</span>
                                                </div>
                                                <ChevronDown size={15} className={`text-slate-400 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Date Picker Popover */}
                                            <AnimatePresence>
                                            {isDatePickerOpen && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 8 }}
                                                    className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 w-[270px] p-3"
                                                >
                                                    {/* Month header navigation */}
                                                    <div className="flex items-center justify-between mb-2.5 px-0.5">
                                                        <button 
                                                            onClick={() => {
                                                                if (selectedMonth === 0) {
                                                                    setSelectedMonth(11);
                                                                    setSelectedYear(selectedYear - 1);
                                                                } else {
                                                                    setSelectedMonth(selectedMonth - 1);
                                                                }
                                                            }}
                                                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
                                                        >
                                                            <ChevronLeft size={15} />
                                                        </button>
                                                        <span className="text-[12px] font-bold text-slate-800">Tháng {selectedMonth + 1}, {selectedYear}</span>
                                                        <button 
                                                            onClick={() => {
                                                                if (selectedMonth === 11) {
                                                                    setSelectedMonth(0);
                                                                    setSelectedYear(selectedYear + 1);
                                                                } else {
                                                                    setSelectedMonth(selectedMonth + 1);
                                                                }
                                                            }}
                                                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
                                                        >
                                                            <ChevronRight size={15} />
                                                        </button>
                                                    </div>

                                                    {/* Day-of-week labels */}
                                                    <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-400">
                                                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                                            <div key={d} className="py-0.5">{d}</div>
                                                        ))}
                                                    </div>

                                                    {/* Calendar Days */}
                                                    <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                                                        {generateCalendarDays().map((cell, idx) => {
                                                            const isToday = cell.day === now.getDate() && cell.month === now.getMonth() && cell.year === now.getFullYear();
                                                            const isSelected = selectedDate === formatDateToYMD(cell.year, cell.month, cell.day);
                                                            const isCurrentMonth = cell.month === selectedMonth;

                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        const ymd = formatDateToYMD(cell.year, cell.month, cell.day);
                                                                        setSelectedDate(ymd);
                                                                        setIsDatePickerOpen(false);
                                                                        setFieldErrors((prev) => ({ ...prev, date: undefined }));
                                                                    }}
                                                                    className={`py-1 rounded-lg font-semibold transition-all border-none bg-transparent cursor-pointer ${
                                                                        isSelected 
                                                                            ? 'bg-[#ee1314] text-white font-bold' 
                                                                            : isToday 
                                                                                ? 'text-[#ee1314] font-bold hover:bg-slate-50' 
                                                                                : isCurrentMonth 
                                                                                    ? 'text-slate-700 hover:bg-slate-50' 
                                                                                    : 'text-slate-300 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    {cell.day}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Today trigger */}
                                                    <div className="border-t border-slate-100 mt-2 pt-2 text-center">
                                                        <button 
                                                            onClick={() => {
                                                                const todayYMD = formatDateToYMD(now.getFullYear(), now.getMonth(), now.getDate());
                                                                setSelectedDate(todayYMD);
                                                                setSelectedMonth(now.getMonth());
                                                                setSelectedYear(now.getFullYear());
                                                                setIsDatePickerOpen(false);
                                                                setFieldErrors((prev) => ({ ...prev, date: undefined }));
                                                            }}
                                                            className="text-[11.5px] font-bold text-[#ee1314] hover:bg-red-50 px-3 py-1 rounded-lg transition-colors border-none bg-transparent flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                                                        >
                                                            <Calendar size={11} />
                                                            Hôm nay
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                            </AnimatePresence>
                                        </div>
                                        {fieldErrors.date && (
                                            <span className="text-[11px] text-red-500 font-medium">{fieldErrors.date}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Sequence Number Input */}
                                <div className="flex flex-col gap-1.5 mt-1">
                                    <label className="text-[12.5px] font-bold text-slate-700">Nhập dãy số trên vé</label>
                                    <div className="relative">
                                        <input 
                                            ref={ticketNumberInputRef}
                                            type="text" 
                                            placeholder="Nhập dãy số (ví dụ: 123456)"
                                            maxLength={6}
                                            value={ticketNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setTicketNumber(val);
                                                if (fieldErrors.number) {
                                                    setFieldErrors((prev) => ({ ...prev, number: undefined }));
                                                }
                                            }}
                                            className={`w-full p-2.5 pl-10 rounded-xl border outline-none text-[14px] font-bold text-slate-800 transition-all tracking-[2px] placeholder:tracking-normal placeholder:font-normal ${
                                                fieldErrors.number
                                                    ? 'border-red-400 ring-2 ring-red-50'
                                                    : 'border-slate-200 focus:border-[#ee1314] focus:ring-2 focus:ring-red-50'
                                            }`}
                                        />
                                        <Ticket size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                    {fieldErrors.number ? (
                                        <span className="text-[11px] text-red-500 font-medium">{fieldErrors.number}</span>
                                    ) : (
                                        <span className="text-[11.5px] text-slate-400">Nhập đúng 6 chữ số trên vé của bạn</span>
                                    )}
                                </div>

                                {/* Action search button */}
                                <motion.button 
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCheck}
                                    className="w-full bg-[#ee1314] text-white rounded-xl py-3 flex items-center justify-center gap-2 mt-3 font-bold hover:bg-[#d61112] hover:shadow-lg hover:shadow-[#ee1314]/25 transition-all duration-300 cursor-pointer border-none text-[13.5px]"
                                >
                                    Tra cứu kết quả
                                </motion.button>

                                {/* Quick Selection Buttons */}
                                <div className="mt-3 border-t border-slate-100 pt-3">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-2.5 text-center">Hoặc chọn nhanh</span>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { label: 'Hôm nay', daysOffset: 0 },
                                            { label: 'Hôm qua', daysOffset: 1 },
                                        ].map((opt) => {
                                            const targetDate = new Date();
                                            targetDate.setDate(targetDate.getDate() - opt.daysOffset);
                                            const targetYMD = formatDateToYMD(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                                            const isSelected = selectedDate === targetYMD;

                                            return (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => {
                                                        setSelectedDate(targetYMD);
                                                        setSelectedMonth(targetDate.getMonth());
                                                        setSelectedYear(targetDate.getFullYear());
                                                        setFieldErrors((prev) => ({ ...prev, date: undefined }));
                                                    }}
                                                    className={`py-2 px-2.5 rounded-xl border text-[11.5px] font-bold transition-all border-none cursor-pointer text-center ${
                                                        isSelected 
                                                            ? 'bg-red-50 text-[#ee1314]' 
                                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        )}
        </AnimatePresence>
    );

    return (
        <div className="relative mt-4">
            {/* The collapsed banner (always visible as the anchor) */}
            <motion.div 
                whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(238, 19, 20, 0.08)' }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="bg-gradient-to-b from-[#FFFDFD] to-[#FFF6F6] rounded-2xl border border-red-100 p-5 flex flex-col items-center justify-center relative shadow-sm"
            >
                <div className="flex items-center gap-2.5 mb-2 w-full">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#ee1314] shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">search</span>
                    </div>
                    <span className="text-[15px] font-bold text-[#212B36]">Dò vé số</span>
                </div>
                <p className="text-[13px] text-slate-500 mb-4 w-full">
                    Dò nhanh kết quả vé số của bạn chuẩn xác nhất
                </p>
                <motion.button 
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                        handleReset();
                        setIsExpanded(true);
                    }}
                    className="w-full bg-gradient-to-r from-[#ee1314] to-[#f43f5e] text-white font-bold py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#ee1314]/25 transition-all duration-300 relative cursor-pointer text-[13px] border-none flex items-center justify-center gap-1.5"
                >
                    <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                    Dò ngay
                </motion.button>
            </motion.div>

            {/* Portal to document.body */}
            {createPortal(modalContent, document.body)}
        </div>
    );
};
