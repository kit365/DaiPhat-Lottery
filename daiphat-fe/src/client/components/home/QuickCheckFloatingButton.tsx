import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuickCheckStore } from '../../../stores/useQuickCheckStore';

export const QuickCheckFloatingButton: React.FC = () => {
    const location = useLocation();
    const { isOpen, openModal } = useQuickCheckStore();

    // Do not show on admin routes
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/setup-profile')) {
        return null;
    }

    return (
        <div className={`fixed right-5 z-[990] transition-all duration-300 ${
            isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        } bottom-[95px] lg:bottom-6`}>
            {/* Pulsing ring background */}
            <div className="absolute inset-0 rounded-full bg-[#ee1314]/35 animate-ping -z-10 scale-110"></div>
            
            <button
                onClick={openModal}
                className="flex items-center gap-2 h-14 px-4 lg:px-5 rounded-full bg-gradient-to-r from-[#ee1314] to-[#f43f5e] text-white font-bold shadow-[0_6px_20px_rgba(238,19,20,0.4)] hover:shadow-[0_8px_25px_rgba(238,19,20,0.55)] transition-all active:scale-95 cursor-pointer group select-none"
            >
                <span className="material-symbols-outlined text-[24px] text-white group-hover:rotate-12 transition-transform duration-300">
                    confirmation_number
                </span>
                
                {/* Text is always visible or expandable on desktop hover */}
                <span className="text-[14px] tracking-tight font-client-display uppercase whitespace-nowrap max-w-0 lg:max-w-xs overflow-hidden opacity-0 lg:opacity-100 lg:group-hover:max-w-xs lg:group-hover:opacity-100 transition-all duration-300 ease-out">
                    Tra cứu vé
                </span>
                
                {/* For mobile layout, we display a short label or just keep it small */}
                <span className="text-[12px] tracking-tight font-client-display uppercase whitespace-nowrap block lg:hidden">
                    Dò vé
                </span>
            </button>
        </div>
    );
};
