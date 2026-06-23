import React, { useState, useEffect } from 'react';
import { lotteryStationService } from '../../services/lotteryStationService';
import { LotteryStationDraw } from '../../types/lottery';
import { useCheckWinning } from '../../hooks/useLottery';

interface QuickCheckTicketBannerProps {
    availableDates?: string[];
}

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
    const [ticketNumber, setTicketNumber] = useState<string>('');
    const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
    
    const { 
        check, 
        reset, 
        isChecking, 
        hasChecked, 
        checkResult, 
        errorMessage, 
        setErrorMessage 
    } = useCheckWinning();

    useEffect(() => {
        if (!isExpanded || !selectedDate) return;

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
    }, [selectedDate, isExpanded]);

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
            // Error is already handled by the hook
        }
    };

    const handleReset = () => {
        reset();
        setTicketNumber('');
    };

    return (
        <div className="relative mt-4">
            {/* The collapsed banner (always visible as the anchor) */}
            <div className="bg-[#fff9f8] rounded-2xl border border-dashed border-[#ffc4c4] p-5 flex flex-col items-center justify-center relative">
                <div className="flex items-center gap-2 mb-2 w-full">
                    <span className="material-symbols-outlined text-[20px] text-[#ee1314]">search</span>
                    <span className="text-[16px] font-bold text-[#ee1314]">Tra cứu vé số</span>
                </div>
                <p className="text-[13px] text-[#666666] mb-4 w-full">
                    Dò nhanh kết quả vé số của bạn
                </p>
                <button 
                    onClick={() => {
                        handleReset();
                        setIsExpanded(true);
                    }}
                    className="w-full bg-white border border-[#ee1314] text-[#ee1314] font-bold py-2.5 rounded-xl hover:bg-[#fff0f0] transition-colors relative cursor-pointer"
                >
                    Tra cứu ngay
                </button>
            </div>

            {/* The pop-up form */}
            {isExpanded && (
                <>
                    {/* Invisible overlay to close on click outside */}
                    <div 
                        className="fixed inset-0 z-[90]" 
                        onClick={() => setIsExpanded(false)}
                    />
                    
                    {/* Pop-up container positioned to the right of the banner */}
                    <div className="absolute left-[calc(100%+16px)] top-0 z-[100] w-[320px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-[20px] text-[#ee1314]">search</span>
                                <span className="text-[16px] font-bold text-[#333333]">Tra cứu vé số</span>
                            </div>
                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <div className="p-5 flex flex-col gap-4">
                            {isChecking && (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <div className="w-8 h-8 border-3 border-t-[#ee1314] border-gray-200 rounded-full animate-spin"></div>
                                    <p className="text-[14px] text-[#666666] font-medium">Đang dò kết quả...</p>
                                </div>
                            )}

                            {!isChecking && errorMessage && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center flex flex-col items-center">
                                    <span className="material-symbols-outlined text-[32px] text-red-500 mb-1.5">error</span>
                                    <p className="text-[13px] text-red-600 font-medium leading-relaxed">{errorMessage}</p>
                                    <button 
                                        onClick={() => setErrorMessage(null)}
                                        className="mt-3 text-[13px] bg-[#ee1314] text-white px-4 py-1.5 rounded-lg font-bold hover:bg-[#d61112] transition-colors cursor-pointer"
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
                                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-center">
                                                <span className="text-[28px] mb-1 block">🎉</span>
                                                <h4 className="text-[15px] font-bold text-emerald-800">Chúc mừng bạn đã trúng!</h4>
                                                <p className="text-[12px] text-emerald-600 mt-1">Vé số của bạn trùng khớp với kết quả:</p>
                                            </div>
                                            
                                            {/* Prize list */}
                                            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                                                {checkResult.matchedPrizes.map((prize, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div>
                                                            <div className="text-[13px] font-bold text-slate-800">{prize.prizeDisplayName}</div>
                                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                              Số trúng: <span className="font-bold text-[#ee1314]">{prize.winningNumber}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-[14px] font-extrabold text-[#ee1314]">
                                                            {(prize.prizeValue || 0).toLocaleString('vi-VN')}đ
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Total winning amount */}
                                            {checkResult.matchedPrizes.length > 1 && (
                                                <div className="bg-gradient-to-r from-[#ee1314]/5 to-[#ee1314]/10 rounded-xl p-4 flex items-center justify-between border border-[#ee1314]/10">
                                                    <span className="text-[13px] font-bold text-slate-700">Tổng giải thưởng:</span>
                                                    <span className="text-[16px] font-black text-[#ee1314]">
                                                        {(checkResult.totalWinningAmount || 0).toLocaleString('vi-VN')}đ
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : !checkResult?.resultAvailable ? (
                                        /* Result not available state */
                                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 text-center flex flex-col items-center gap-2">
                                            <span className="text-[32px] filter grayscale">⏳</span>
                                            <h4 className="text-[14px] font-bold text-slate-700">Chưa có kết quả</h4>
                                            <p className="text-[12px] text-slate-500 leading-relaxed">
                                                Kết quả xổ số đài này ngày {checkResult?.drawDate ? new Date(checkResult.drawDate).toLocaleDateString('vi-VN') : 'đã chọn'} chưa được cập nhật. Vui lòng quay lại sau!
                                            </p>
                                        </div>
                                    ) : (
                                        /* Losing state */
                                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-6 text-center flex flex-col items-center gap-2">
                                            <span className="text-[32px] filter grayscale">🍀</span>
                                            <h4 className="text-[14px] font-bold text-slate-700">Rất tiếc, chưa trúng giải</h4>
                                            <p className="text-[12px] text-slate-500 leading-relaxed">
                                                Vé số của bạn không trùng với giải nào lần này. Chúc bạn may mắn lần sau!
                                            </p>
                                        </div>
                                    )}
                                    <button 
                                        onClick={handleReset}
                                        className="w-full bg-white border border-gray-200 text-slate-600 rounded-lg py-2.5 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-[13px]"
                                    >
                                        Dò vé khác
                                    </button>
                                </div>
                            )}

                            {!isChecking && !errorMessage && !hasChecked && (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13px] font-medium text-[#666666]">Ngày quay</label>
                                        <div className="relative">
                                            <input 
                                                type="date" 
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full p-2.5 rounded-lg border border-gray-200 outline-none text-[14px] text-[#333333] pl-10 bg-white"
                                                style={{ colorScheme: "light" }}
                                            />
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#ee1314] pointer-events-none">
                                                calendar_month
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13px] font-medium text-[#666666]">Chọn đài</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full p-2.5 rounded-lg border border-gray-200 outline-none text-[14px] text-[#333333] bg-white appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                                                disabled={isLoadingProvinces || stations.length === 0}
                                                value={selectedStationId}
                                                onChange={(e) => setSelectedStationId(e.target.value ? Number(e.target.value) : '')}
                                            >
                                                <option value="">
                                                    {isLoadingProvinces ? 'Đang tải đài...' : stations.length === 0 ? 'Không có đài nào' : '-- Chọn đài --'}
                                                </option>
                                                {stations.map((station) => (
                                                    <option key={station.id} value={station.id}>{station.province}</option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                                                expand_more
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13px] font-medium text-[#666666]">Số vé</label>
                                        <input 
                                            type="text" 
                                            placeholder="Nhập số vé (5-6 số)"
                                            maxLength={6}
                                            value={ticketNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setTicketNumber(val);
                                            }}
                                            className="w-full p-2.5 rounded-lg border border-gray-200 outline-none text-[14px] text-[#333333] focus:border-[#ee1314] transition-colors"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCheck}
                                        className="w-full bg-[#ee1314] text-white rounded-lg py-3 flex items-center justify-center gap-2 mt-2 font-bold hover:bg-[#d61112] transition-colors cursor-pointer shadow-md shadow-[#ee1314]/20"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">search</span>
                                        Kiểm tra kết quả
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
