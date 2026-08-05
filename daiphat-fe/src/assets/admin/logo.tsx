interface LogoAdminProps {
    showText?: boolean;
    className?: string;
}

export const LogoAdmin = ({ showText = false, className }: LogoAdminProps) => {
    return (
        <div className={`flex items-center gap-3 ${className || ''}`}>
            <div className="relative p-[2px] bg-gradient-to-tr from-[#ee1314] to-[#F59E0B] rounded-xl shadow-md shadow-[#ee1314]/10 shrink-0 w-[40px] h-[40px] flex items-center justify-center">
                <img 
                    src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" 
                    alt="Đại Phát Logo"
                    className="w-full h-full rounded-[10px] object-cover bg-white" 
                />
            </div>
            {showText && (
                <div className="flex flex-col justify-center overflow-hidden text-left">
                    <span className="text-[18px] tracking-tight font-black text-[#ee1314] leading-none mb-1 whitespace-nowrap font-sans">
                        ĐẠI PHÁT
                    </span>
                    <span className="text-[8px] font-bold text-[#F59E0B] leading-none uppercase tracking-wider whitespace-nowrap font-sans">
                        Tài lộc - May mắn - Thịnh vượng
                    </span>
                </div>
            )}
        </div>
    );
};