interface Section1Props {
    activeType: string;
    onTypeChange: (type: string) => void;
}

export const Section1 = ({ activeType, onTypeChange }: Section1Props) => {
    const tabs = [
        { type: "ALL", label: "Tất cả", icon: "★" },
        { type: "DOG", label: "Chăm sóc chó", iconSrc: "https://wordpress.themehour.net/babet/wp-content/uploads/2025/09/service-tab-icon-1-1.1.svg" },
        { type: "CAT", label: "Chăm sóc mèo", iconSrc: "https://wordpress.themehour.net/babet/wp-content/uploads/2025/09/service-tab-icon-1-1.6.svg" }
    ];

    return (
        <div className="app-container">
            <div className="flex justify-center flex-wrap gap-[30px] mb-[70px]">
                {tabs.map((tab) => {
                    const isActive = activeType === tab.type;
                    return (
                        <div
                            key={tab.type}
                            onClick={() => onTypeChange(tab.type)}
                            className={`item-service group cursor-pointer min-w-[200px] p-[25px] rounded-[40px] transition-all duration-500 flex flex-col items-center gap-[15px] border-2
                                ${isActive
                                    ? 'bg-client-primary text-white border-client-primary shadow-[0_20px_40px_-10px_rgba(230,126,32,0.4)] scale-105 active'
                                    : 'bg-white text-client-secondary border-[#fff0f0] hover:border-client-primary/30 hover:bg-[#fff0f0]/50 hover:translate-y-[-5px]'}`}
                        >
                            <div className={`w-[65px] h-[65px] rounded-full flex items-center justify-center transition-all duration-500 shadow-inner
                                ${isActive ? 'bg-white/20 rotate-[360deg]' : 'bg-[#fff0f0]'}`}>
                                {tab.iconSrc ? (
                                    <img src={tab.iconSrc} alt={tab.label} className={`w-[35px] h-[35px] object-contain transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                ) : (
                                    <span className={`text-[24px] font-bold ${isActive ? 'text-white' : 'text-client-primary'}`}>★</span>
                                )}
                            </div>
                            <span className="font-secondary text-[17px] font-bold uppercase tracking-[2px]">{tab.label}</span>
                            {isActive && (
                                <div className="w-[10px] h-[10px] bg-white rounded-full animate-bounce mt-[-5px]"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}