import { Link } from "react-router-dom";

export const BrandMark = ({ className = "w-9 h-9" }: { className?: string }) => (
    <svg aria-hidden="true" className={`${className} text-[#FF6262]`} viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="currentColor" />
        <path
            d="M18 7.2 21.2 14h7l-5.6 4.6 1.8 7-6.4-3.8-6.4 3.8 1.8-7L7.8 14h7L18 7.2Z"
            fill="#FFB800"
            stroke="#FFB800"
            strokeWidth=".6"
            strokeLinejoin="round"
        />
    </svg>
);

export const GoogleIcon = () => (
    <svg aria-hidden="true" className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
);

export const VisualPanelContent = () => (
    <div className="relative w-full h-full bg-[#102937] overflow-hidden flex flex-col justify-end p-10 lg:p-12">
        {/* Decorative backgrounds */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-radial-gradient from-[#FF6262]/20 to-transparent blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-radial-gradient from-[#FFB800]/10 to-transparent blur-[80px]" />
        
        {/* Visual Copy */}
        <div className="relative z-10 max-w-[400px]">
            <h2 className="font-client-display text-4xl lg:text-5xl font-black text-white leading-[1.1] mb-6">Vận May Nằm Trong Tầm Tay Của Bạn.</h2>
            <p className="text-white/60 text-lg font-medium leading-relaxed mb-8">Nền tảng xổ số trực tuyến an toàn, minh bạch và cơ hội trúng lớn mỗi ngày.</p>
            <div className="flex gap-2">
                <span className="w-8 h-1.5 rounded-full bg-[#FF6262]" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
        </div>
    </div>
);

export const AuthBranding = ({ onClick }: { onClick?: () => void }) => (
    <div 
        className="flex items-center gap-3 select-none transition-transform active:scale-95" 
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        onClick={(e) => {
            if (onClick) {
                e.preventDefault();
                onClick();
            }
        }}
    >
        <BrandMark className="w-10 h-10" />
        <span className="flex flex-col">
            <strong className="text-lg font-black text-[#102937] leading-[1.1] tracking-tight">Đại Phát</strong>
            <small className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] -mt-0.5">Lottery Platform</small>
        </span>
    </div>
);
