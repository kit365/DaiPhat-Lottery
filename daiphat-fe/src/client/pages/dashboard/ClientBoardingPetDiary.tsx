import { useState, useEffect } from "react";
import { getClientBoardingPetDiaries } from "../../api/boarding-pet-diary.api";
import dayjs from "dayjs";
import { Icon } from "@iconify/react";

export const ClientBoardingPetDiary = ({ bookingId }: { bookingId: string }) => {
    const [diaries, setDiaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!bookingId) return;
        const fetchDiaries = async () => {
            setLoading(true);
            try {
                const res = await getClientBoardingPetDiaries(bookingId);
                setDiaries(res.data || []);
            } catch (error) {
                console.error("Failed to load pet diaries");
            } finally {
                setLoading(false);
            }
        };
        fetchDiaries();
    }, [bookingId]);

    if (loading) return <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-client-primary mx-auto"></div><p className="mt-2 text-gray-500">Đang tải nhật ký...</p></div>;

    // Group by Date -> Meal -> diaries
    const grouped = diaries.reduce((acc: any, diary: any) => {
        const dateStr = dayjs(diary.date).format("YYYY-MM-DD");
        if (!acc[dateStr]) acc[dateStr] = {};
        if (!acc[dateStr][diary.meal]) acc[dateStr][diary.meal] = [];
        acc[dateStr][diary.meal].push(diary);
        return acc;
    }, {});

    const hasData = diaries.length > 0;

    const MEAL_CONFIG = {
        "Sáng": { label: "BỮA SÁNG", icon: "fluent:weather-sunny-24-filled", color: "#2E7D32", bg: "#E8F5E9" },
        "Trưa": { label: "BỮA TRƯA", icon: "fluent:weather-sunny-high-24-filled", color: "#006097", bg: "#E3F2FD" },
        "Tối": { label: "BỮA TỐI", icon: "fluent:weather-moon-24-filled", color: "#EF6C00", bg: "#FFF3E0" }
    };

    return (
        <section className="mt-[20px]">
            <div className="flex items-center gap-[10px] mb-[16px]">
                <div className="text-client-primary">
                    <Icon icon="fluent:book-journal-24-filled" width={22} />
                </div>
                <h3 className="text-[18px] font-[800] text-client-secondary">Nhật ký lưu trú hàng ngày</h3>
            </div>

            {!hasData ? (
                <div className="bg-white rounded-[24px] border border-[#f0f0f0] p-[40px] text-center">
                    <p className="text-[#a1a1a1] text-[15px]">Hiện chưa có nhật ký. Bé sẽ được cập nhật tình trạng sau mỗi bữa ăn.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.keys(grouped).sort((a, b) => dayjs(b).diff(dayjs(a))).map(dateStr => {
                        const petName = diaries[0]?.petId?.name || "Bé";
                        const displayDate = dayjs(dateStr).format("DD/MM/YYYY");

                        return (
                            <div key={dateStr} className="space-y-6">
                                {/* Date Header */}
                                <div className="text-center">
                                    <h2 className="text-[24px] font-[800] text-client-secondary tracking-tight">
                                        {displayDate}
                                    </h2>
                                    <p className="text-[14px] text-gray-500 font-medium tracking-tight">Hôm nay của {petName} thế nào?</p>
                                </div>

                                {/* Meal Timeline */}
                                <div className="space-y-6 max-w-2xl mx-auto w-full">
                                    {["Sáng", "Trưa", "Tối"].map(mealKey => {
                                        const mealLogs = grouped[dateStr][mealKey];
                                        if (!mealLogs || mealLogs.length === 0) return null;
                                        const cfg = MEAL_CONFIG[mealKey as keyof typeof MEAL_CONFIG] || MEAL_CONFIG["Sáng"];

                                        return (
                                            <div key={mealKey} className="space-y-3">
                                                {/* Meal Header Badge */}
                                                <div className="flex items-center gap-2 mb-1 px-2">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                                        <Icon icon={cfg.icon} width={18} />
                                                    </div>
                                                    <span className="font-[800] text-[13px] tracking-wider uppercase" style={{ color: cfg.color }}>{cfg.label}</span>
                                                </div>

                                                <div className="space-y-2">
                                                    {mealLogs.map((log: any) => (
                                                        <div key={log._id} className="bg-white rounded-[18px] p-3.5 shadow-sm border border-[#f0f0f0] hover:border-client-primary/10 transition-colors">
                                                            {/* Pet Info - NO AVATAR, COMPACT */}
                                                            <div className="flex items-center gap-2 mb-3 px-1">
                                                                <div className="w-2 h-4 bg-client-primary/30 rounded-full"></div>
                                                                <span className="font-[800] text-[15px] text-client-secondary">{log.petId?.name}</span>
                                                            </div>

                                                            {/* Status Grid - ULTRA COMPACT */}
                                                            <div className="grid grid-cols-3 gap-1.5">
                                                                <div className="bg-[#f2f9f3] rounded-[12px] p-2 flex items-center gap-2">
                                                                    <Icon icon="fluent:food-24-filled" width={18} className="text-[#2e7d32] flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[12px] font-[800] text-[#2e7d32] truncate leading-tight">{log.eatingStatus}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-[#f0f7ff] rounded-[12px] p-2 flex items-center gap-2">
                                                                    <Icon icon="fluent:drop-24-filled" width={18} className="text-[#1565c0] flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[12px] font-[800] text-[#1565c0] truncate leading-tight">{log.digestionStatus}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-[#fff8f0] rounded-[12px] p-2 flex items-center gap-2">
                                                                    <Icon icon={log.moodStatus === 'Vui Vẻ' ? 'fluent:emoji-24-filled' : 'fluent:emoji-sad-24-filled'} width={18} className="text-[#ef6c00] flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[12px] font-[800] text-[#ef6c00] truncate leading-tight">{log.moodStatus}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Note section */}
                                                            {log.note && (
                                                                <div className="mt-3 pt-2.5 border-t border-gray-100/60 flex gap-2 items-start">
                                                                    <p className="text-[12px] text-gray-500 leading-snug italic">
                                                                        <span className="font-bold not-italic text-gray-400 mr-1">Lưu ý:</span> {log.note}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
