import React from 'react';
import { useQuickCheckStore } from '../../../stores/useQuickCheckStore';

interface QuickCheckTicketBannerProps {
    availableDates?: string[];
}

export const QuickCheckTicketBanner: React.FC<QuickCheckTicketBannerProps> = () => {
    const { openModal } = useQuickCheckStore();

    return (
        <div className="relative mt-4">
            {/* The collapsed banner - updated to be more premium */}
            <div className="bg-gradient-to-br from-[#fffaf9] to-[#fff5f5] rounded-2xl border border-dashed border-[#ffc4c4] p-5 flex flex-col items-center justify-center relative shadow-[0_2px_10px_rgba(238,19,20,0.02)]">
                <div className="flex items-center gap-2 mb-2.5 w-full">
                    <span className="material-symbols-outlined text-[20px] text-[#ee1314]">search</span>
                    <span className="text-[15px] font-bold text-[#ee1314] font-client-display uppercase tracking-tight">Tra cứu vé số</span>
                </div>
                <p className="text-[13px] text-[#666666] mb-4.5 w-full leading-relaxed">
                    Dò nhanh kết quả vé số của bạn một cách chính xác & tức thì.
                </p>
                <button 
                    onClick={openModal}
                    className="w-full bg-white border border-[#ee1314] text-[#ee1314] font-bold py-2.5 rounded-xl hover:bg-[#fff0f0] transition-colors relative cursor-pointer active:scale-95 shadow-sm font-client-display uppercase tracking-tight text-[13px]"
                >
                    Tra cứu ngay
                </button>
            </div>
        </div>
    );
};
