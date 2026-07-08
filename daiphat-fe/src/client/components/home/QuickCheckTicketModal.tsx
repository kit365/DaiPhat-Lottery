import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuickCheckStore } from '../../../stores/useQuickCheckStore';
import { useCheckWinning } from '../../hooks/useLottery';
import { lotteryStationService } from '../../services/lotteryStationService';
import { LotteryStationDraw } from '../../types/lottery';
import { buildRecentDateOptions } from '../../types/lottery';

export const QuickCheckTicketModal: React.FC = () => {
    const { isOpen, closeModal } = useQuickCheckStore();
    const availableDates = buildRecentDateOptions(14);

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
    const [ticketNumber, setTicketNumber] = useState<string>('');
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    
    // Custom dropdown states
    const [isStationOpen, setIsStationOpen] = useState(false);
    const [isDateOpen, setIsDateOpen] = useState(false);
    
    // Station search and full list states
    const [searchQuery, setSearchQuery] = useState('');
    const [allStations, setAllStations] = useState<LotteryStationDraw[]>([]);
    const [showAllStations, setShowAllStations] = useState(false);

    // Calendar navigation state
    const [viewDate, setViewDate] = useState<Date>(new Date());

    const { 
        check, 
        reset, 
        isChecking, 
        hasChecked, 
        checkResult, 
        errorMessage, 
        setErrorMessage 
    } = useCheckWinning();

    // Fetch stations when selectedDate changes or modal opens
    useEffect(() => {
        if (!isOpen || !selectedDate) return;

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
    }, [selectedDate, isOpen]);

    // Update calendar view month when selected date changes or calendar opens
    useEffect(() => {
        if (isDateOpen && selectedDate) {
            const parts = selectedDate.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                setViewDate(new Date(y, m, 1));
            }
        }
    }, [isDateOpen, selectedDate]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleCheck = async () => {
        if (!selectedStationId) {
            setErrorMessage('Vui lòng chọn đài quay.');
            return;
        }
        if (!ticketNumber || ticketNumber.trim().length < 5) {
            setErrorMessage('Vui lòng nhập số vé hợp lệ (5 hoặc 6 chữ số).');
            return;
        }
        
        try {
            const displayDate = fromDateInputValue(selectedDate);
            await check(
                Number(selectedStationId),
                displayDate,
                ticketNumber.trim()
            );
        } catch (error) {
            // Error is handled inside hook
        }
    };

    const handleReset = () => {
        reset();
        setTicketNumber('');
        setIsStationOpen(false);
        setIsDateOpen(false);
        setSearchQuery('');
        setShowAllStations(false);
    };

    const handleClose = () => {
        handleReset();
        closeModal();
    };

    const setToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        setIsDateOpen(false);
    };

    const setYesterday = () => {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        setSelectedDate(yesterday);
        setIsDateOpen(false);
    };

    const setSevenDaysAgo = () => {
        const sevenDays = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        setSelectedDate(sevenDays);
        setIsDateOpen(false);
    };

    // Load all stations when user clicks "Xem tất cả đài"
    const handleShowAllStations = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (allStations.length === 0) {
            try {
                const schedule = await lotteryStationService.getPublicSchedule();
                const mapped: LotteryStationDraw[] = schedule.map(item => ({
                    id: item.stationId,
                    province: item.stationName.replace(/^(Xổ số|XS)\s+/i, ''),
                    drawTime: item.drawTime
                }));
                // Deduplicate stations
                const unique: LotteryStationDraw[] = [];
                const seenIds = new Set<number>();
                for (const st of mapped) {
                    if (!seenIds.has(st.id)) {
                        seenIds.add(st.id);
                        unique.push(st);
                    }
                }
                setAllStations(unique);
            } catch (err) {
                console.error("Failed to load all stations", err);
            }
        }
        setShowAllStations(true);
    };

    // Filter displayed stations based on search query and "Show All" toggle
    const filteredStations = useMemo(() => {
        const list = showAllStations ? allStations : stations;
        if (!searchQuery.trim()) return list;
        return list.filter(st => 
            st.province.toLowerCase().includes(searchQuery.toLowerCase().trim())
        );
    }, [showAllStations, stations, allStations, searchQuery]);

    // Calendar grid calculations
    const calendarCells = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday, etc.
        // Convert to 0-indexed starting Monday: Mon=0, Tue=1, ..., Sun=6
        const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

        const cells = [];

        // Previous month days to fill empty spots
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startOffset - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            cells.push({
                day,
                isCurrentMonth: false,
                date: new Date(year, month - 1, day)
            });
        }

        // Current month days
        const currentMonthLastDay = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= currentMonthLastDay; i++) {
            cells.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Next month days to pad to 42 cells (6 rows)
        const remainingCells = 42 - cells.length;
        for (let i = 1; i <= remainingCells; i++) {
            cells.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        return cells;
    }, [viewDate]);

    // Check if cell date is the currently selectedDate
    const isSameDay = (date1: Date, date2Str: string) => {
        const parts = date2Str.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return date1.getFullYear() === y && date1.getMonth() === m && date1.getDate() === d;
        }
        return false;
    };

    const prevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleSelectCellDate = (cellDate: Date) => {
        const year = cellDate.getFullYear();
        const month = String(cellDate.getMonth() + 1).padStart(2, '0');
        const day = String(cellDate.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
        setIsDateOpen(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="fixed inset-0 z-[10500] flex items-center justify-center p-4 bg-black/45 pointer-events-auto"
                >
                    {/* Backdrop click close */}
                    <div className="absolute inset-0 cursor-default" onClick={handleClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="relative bg-white rounded-[28px] shadow-2xl overflow-visible max-w-[480px] w-full flex flex-col pointer-events-auto border border-slate-100 p-6 sm:p-7.5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button 
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100/80 hover:text-red-600 transition-all cursor-pointer flex items-center justify-center active:scale-90 absolute top-5 right-5 z-10"
                            aria-label="Close dialog"
                        >
                            <span className="material-symbols-outlined text-[18px] font-bold">close</span>
                        </button>

                        {/* Title Header */}
                        <div className="text-center mt-2.5 mb-5.5">
                            <h3 className="text-[20px] font-bold text-[#ee1314] uppercase tracking-wider font-client-display">TRA CỨU VÉ SỐ</h3>
                            <p className="text-[12.5px] text-slate-500 mt-1 font-medium">Nhập thông tin vé để kiểm tra kết quả nhanh chóng</p>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 flex flex-col gap-4.5 pr-0.5 overflow-visible">
                            {isChecking && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-[#ee1314]/20 border-t-[#ee1314] rounded-full animate-spin"></div>
                                        <span className="material-symbols-outlined text-[24px] text-[#ee1314] absolute animate-pulse">search</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[15px] text-slate-700 font-bold">Đang kết nối hệ thống...</p>
                                        <p className="text-[12px] text-slate-400 mt-1">Đang dò tấm vé {ticketNumber} của bạn</p>
                                    </div>
                                </div>
                            )}

                            {!isChecking && errorMessage && (
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center flex flex-col items-center gap-3 animate-in fade-in duration-200">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                        <span className="material-symbols-outlined text-[28px]">error</span>
                                    </div>
                                    <div>
                                        <h4 className="text-[15px] font-bold text-red-800">Không thể kiểm tra</h4>
                                        <p className="text-[13px] text-red-600 mt-1 leading-relaxed">{errorMessage}</p>
                                    </div>
                                    <button 
                                        onClick={() => setErrorMessage(null)}
                                        className="mt-2 text-[13px] bg-[#ee1314] text-white px-5 py-2 rounded-xl font-bold hover:bg-[#d61112] transition-colors cursor-pointer shadow-md shadow-[#ee1314]/20"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            )}

                            {!isChecking && !errorMessage && hasChecked && (
                                <div className="flex flex-col gap-4 sm:gap-5 animate-in fade-in duration-300">
                                    {checkResult?.winning ? (
                                        <div className="flex flex-col gap-4">
                                            {/* Winning Header */}
                                            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-5 text-center relative overflow-hidden">
                                                <div className="absolute -right-6 -top-6 text-[80px] opacity-10 select-none">🎉</div>
                                                <span className="text-[40px] mb-2 block animate-bounce">🎉</span>
                                                <h4 className="text-[18px] font-black text-emerald-800 uppercase tracking-tight">Chúc mừng bạn đã trúng thưởng!</h4>
                                                <p className="text-[12px] text-emerald-600 font-medium mt-1">
                                                    Đài: <span className="font-bold">{checkResult.stationName}</span> | Ngày: <span className="font-bold">{fromDateInputValue(selectedDate)}</span>
                                                </p>
                                            </div>
                                            
                                            {/* Prize List Title */}
                                            <div className="text-[13px] font-bold text-slate-400 uppercase tracking-wider px-1">Danh sách giải thưởng trùng khớp</div>
                                            
                                            {/* Prize list items */}
                                            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                                                {checkResult.matchedPrizes.map((prize, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-[#ee1314]/5 flex items-center justify-center text-[#ee1314]">
                                                                <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                                                            </div>
                                                            <div>
                                                                <div className="text-[14px] font-bold text-slate-800">{prize.prizeDisplayName}</div>
                                                                <div className="text-[12px] text-slate-500 mt-0.5">
                                                                    Số trúng: <span className="font-bold text-[#ee1314] tracking-wider">{prize.winningNumber}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-[16px] font-black text-[#ee1314]">
                                                            {(prize.prizeValue || 0).toLocaleString('vi-VN')}đ
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Total winning amount card */}
                                            <div className="bg-gradient-to-r from-[#ee1314]/5 to-[#ee1314]/10 rounded-2xl p-5 flex items-center justify-between border border-[#ee1314]/15 shadow-sm">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="material-symbols-outlined text-[#ee1314] text-[22px]">payments</span>
                                                    <span className="text-[14px] font-bold text-slate-700">Tổng giải thưởng nhận được:</span>
                                                </div>
                                                <span className="text-[20px] font-black text-[#ee1314]">
                                                    {(checkResult.totalWinningAmount || 0).toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        </div>
                                    ) : !checkResult?.resultAvailable ? (
                                        /* Result not available state */
                                        <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 animate-pulse">
                                                <span className="material-symbols-outlined text-[32px]">hourglass_empty</span>
                                            </div>
                                            <h4 className="text-[15px] font-bold text-amber-800">Chưa có kết quả quay số</h4>
                                            <p className="text-[13px] text-amber-700/80 leading-relaxed max-w-[340px]">
                                                Kết quả xổ số đài <span className="font-bold">{checkResult?.stationName || 'đã chọn'}</span> ngày <span className="font-bold">{fromDateInputValue(selectedDate)}</span> chưa được cập nhật từ hội đồng. Vui lòng quay lại sau!
                                            </p>
                                        </div>
                                    ) : (
                                        /* Losing state */
                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined text-[32px]">sentiment_dissatisfied</span>
                                            </div>
                                            <h4 className="text-[15px] font-bold text-slate-800">Rất tiếc, không trúng giải</h4>
                                            <p className="text-[13px] text-slate-500 leading-relaxed max-w-[320px]">
                                                Vé số của bạn không trùng khớp với bất kỳ giải thưởng nào trong kỳ mở thưởng này. Chúc bạn may mắn hơn lần sau! 🍀
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-2">
                                        <button 
                                            onClick={handleReset}
                                            className="flex-1 bg-[#ee1314] text-white rounded-xl py-3 font-bold hover:bg-[#d61112] transition-colors cursor-pointer text-[14px] text-center shadow-md shadow-[#ee1314]/15 active:scale-95"
                                        >
                                            Dò vé khác
                                        </button>
                                        <button 
                                            onClick={handleClose}
                                            className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl py-3 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-[14px] text-center active:scale-95"
                                        >
                                            Đóng
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isChecking && !errorMessage && !hasChecked && (
                                <>
                                    {/* Select columns grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Custom Station Select */}
                                        <div className="flex flex-col gap-1.5 relative">
                                            <label className="text-[13.5px] font-bold text-slate-700 font-client-display tracking-tight">Chọn đài</label>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsStationOpen(!isStationOpen);
                                                    setIsDateOpen(false);
                                                }}
                                                disabled={isLoadingProvinces || (stations.length === 0 && !showAllStations)}
                                                className={`w-full h-12 rounded-xl outline-none text-[14px] text-slate-800 pl-10 pr-8 bg-white border hover:border-[#ee1314] focus:border-[#ee1314] transition-all flex items-center justify-between cursor-pointer disabled:bg-slate-50 disabled:text-slate-450 disabled:cursor-not-allowed text-left relative ${isStationOpen ? 'border-[#ee1314] shadow-sm z-[51]' : 'border-slate-200'}`}
                                            >
                                                <span className="truncate">
                                                    {selectedStationId 
                                                        ? (stations.find(s => s.id === selectedStationId)?.province || allStations.find(s => s.id === selectedStationId)?.province)
                                                        : (isLoadingProvinces ? 'Đang tải...' : stations.length === 0 && !showAllStations ? 'Không có đài' : 'Chọn đài')
                                                    }
                                                </span>
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#ee1314] pointer-events-none select-none">
                                                    location_on
                                                </span>
                                                <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200 ${isStationOpen ? 'rotate-180' : ''}`}>
                                                    expand_more
                                                </span>
                                            </button>

                                            {/* Station Dropdown Menu List */}
                                            <AnimatePresence>
                                                {isStationOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsStationOpen(false)} />
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 5 }}
                                                            transition={{ duration: 0.1 }}
                                                            className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[280px] flex flex-col overflow-hidden"
                                                        >
                                                            {/* Search bar inside dropdown */}
                                                            <div className="p-2 border-b border-slate-100 flex items-center relative">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Tìm kiếm đài..."
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 text-[13px] text-slate-700 outline-none focus:border-[#ee1314]/40 focus:bg-white transition-all"
                                                                />
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-5 top-1/2 -translate-y-1/2 select-none">
                                                                    search
                                                                </span>
                                                            </div>

                                                            {/* Station Items List */}
                                                            <div className="overflow-y-auto flex-1 py-1">
                                                                {filteredStations.length === 0 ? (
                                                                    <div className="text-center py-4 text-[12px] text-slate-400">
                                                                        Không tìm thấy đài
                                                                    </div>
                                                                ) : (
                                                                    filteredStations.map((station) => {
                                                                        const isSelected = selectedStationId === station.id;
                                                                        return (
                                                                            <button
                                                                                key={station.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedStationId(station.id);
                                                                                    setIsStationOpen(false);
                                                                                }}
                                                                                className={`w-full px-4 py-2.5 text-left text-[14px] hover:bg-slate-50 transition-colors flex items-center justify-between relative ${isSelected ? 'text-[#ee1314] font-bold bg-[#ee1314]/5' : 'text-slate-700'}`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="material-symbols-outlined text-[18px] text-[#ee1314]">
                                                                                        location_on
                                                                                    </span>
                                                                                    <span>{station.province}</span>
                                                                                </div>
                                                                                {isSelected && (
                                                                                    <span className="material-symbols-outlined text-[16px] text-[#ee1314]">check</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>

                                                            {/* Xem tất cả đài option (Only if showAllStations is false) */}
                                                            {!showAllStations && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleShowAllStations}
                                                                    className="w-full h-11 bg-slate-50 border-t border-slate-100 hover:bg-slate-100/70 transition-colors flex items-center justify-center gap-2 text-[#ee1314] font-bold text-[13px] cursor-pointer"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">local_activity</span>
                                                                    <span>Xem tất cả đài</span>
                                                                </button>
                                                            )}
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Custom Date Select with Calendar Widget */}
                                        <div className="flex flex-col gap-1.5 relative">
                                            <label className="text-[13.5px] font-bold text-slate-700 font-client-display tracking-tight">Chọn ngày</label>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsDateOpen(!isDateOpen);
                                                    setIsStationOpen(false);
                                                }}
                                                className={`w-full h-12 rounded-xl border outline-none text-[14px] text-slate-800 pl-10 pr-8 bg-white hover:border-[#ee1314] focus:border-[#ee1314] transition-all flex items-center justify-between cursor-pointer text-left relative ${isDateOpen ? 'border-[#ee1314] shadow-sm z-[51]' : 'border-slate-200'}`}
                                            >
                                                <span className="truncate">
                                                    {fromDateInputValue(selectedDate) || 'Chọn ngày'}
                                                </span>
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#ee1314] pointer-events-none select-none">
                                                    calendar_month
                                                </span>
                                                <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200 ${isDateOpen ? 'rotate-180' : ''}`}>
                                                    expand_more
                                                </span>
                                            </button>

                                            {/* Custom Calendar Widget Dropdown */}
                                            <AnimatePresence>
                                                {isDateOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsDateOpen(false)} />
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 5 }}
                                                            transition={{ duration: 0.1 }}
                                                            className="absolute right-0 top-[calc(100%+6px)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 w-[295px] flex flex-col gap-3 overflow-hidden select-none"
                                                        >
                                                            {/* Calendar Header */}
                                                            <div className="flex items-center justify-between px-1">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={prevMonth}
                                                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                                                </button>
                                                                <span className="text-[13.5px] font-bold text-slate-800">
                                                                    Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}
                                                                </span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={nextMonth}
                                                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                                                </button>
                                                            </div>

                                                            {/* Weekdays Header */}
                                                            <div className="grid grid-cols-7 gap-1 text-center">
                                                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                                                                    <span key={day} className="text-[10px] font-bold text-slate-400 uppercase py-0.5">
                                                                        {day}
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            {/* Calendar Days Grid */}
                                                            <div className="grid grid-cols-7 gap-1.5">
                                                                {calendarCells.map((cell, idx) => {
                                                                    const isSelected = isSameDay(cell.date, selectedDate);
                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            type="button"
                                                                            onClick={() => handleSelectCellDate(cell.date)}
                                                                            className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-[12px] transition-all cursor-pointer ${
                                                                                isSelected 
                                                                                    ? 'bg-[#ee1314] text-white font-bold' 
                                                                                    : cell.isCurrentMonth
                                                                                        ? 'text-slate-800 font-medium hover:bg-slate-100'
                                                                                        : 'text-slate-300 hover:bg-slate-50'
                                                                            }`}
                                                                        >
                                                                            {cell.day}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Bottom 'Hôm nay' action */}
                                                            <button 
                                                                type="button"
                                                                onClick={setToday}
                                                                className="flex items-center justify-center gap-1.5 py-1.5 border-t border-slate-100 text-[#ee1314] hover:bg-red-50/40 rounded-xl font-bold text-[12.5px] cursor-pointer mt-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                                                                <span>Hôm nay</span>
                                                            </button>
                                                        </motion.div>
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Ticket Number input */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13.5px] font-bold text-slate-700 font-client-display tracking-tight">Nhập dãy số trên vé</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Nhập dãy số (ví dụ: 123456)"
                                                maxLength={6}
                                                value={ticketNumber}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    setTicketNumber(val);
                                                }}
                                                className="w-full h-12 rounded-xl border border-slate-200 outline-none text-[14.5px] text-slate-850 pl-10 pr-10 bg-white hover:border-[#ee1314] focus:border-[#ee1314] focus:shadow-sm transition-all font-sans"
                                            />
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-[#ee1314] pointer-events-none select-none">
                                                local_activity
                                            </span>
                                            {ticketNumber && (
                                                <button 
                                                    onClick={() => setTicketNumber('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">close</span>
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-400 ml-0.5">Nhập đúng 6 chữ số trên vé của bạn</span>
                                    </div>

                                    {/* Submit Action Button */}
                                    <button 
                                        onClick={handleCheck}
                                        className="w-full h-[46px] bg-[#ee1314] text-white rounded-xl flex items-center justify-center gap-2 mt-1.5 font-bold hover:bg-[#d61112] transition-all cursor-pointer shadow-md shadow-[#ee1314]/15 active:scale-95 hover:scale-[1.005] text-[14.5px]"
                                    >
                                        <span className="material-symbols-outlined text-[19px]">search</span>
                                        Tra cứu kết quả
                                    </button>

                                    {/* Quick selectors */}
                                    <div className="flex flex-col gap-3 mt-1">
                                        <div className="relative flex py-1 items-center">
                                            <div className="flex-grow border-t border-slate-100/80"></div>
                                            <span className="flex-shrink mx-3 text-[12px] text-slate-400 font-bold bg-white">Hoặc chọn nhanh</span>
                                            <div className="flex-grow border-t border-slate-100/80"></div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <button 
                                                onClick={setToday}
                                                className="h-10 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                                            >
                                                Hôm nay
                                            </button>
                                            <button 
                                                onClick={setYesterday}
                                                className="h-10 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                                            >
                                                Hôm qua
                                            </button>
                                            <button 
                                                onClick={setSevenDaysAgo}
                                                className="h-10 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
                                            >
                                                7 ngày qua
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
