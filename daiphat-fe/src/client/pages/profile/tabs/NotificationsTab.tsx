import React, { useState } from 'react';

export const NotificationsTab = () => {
    const [activeTab, setActiveTab] = useState('Tất cả');
    const tabs = ['Tất cả', 'Vé của tôi', 'Kết quả', 'Hệ thống'];

    return (
        <div className="flex flex-col gap-6">
            {/* Summary Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] cursor-pointer hover:border-[#ee1314] transition-colors">
                    <div className="w-12 h-12 rounded-[14px] bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-[20px] shrink-0">
                        <i className="fa-regular fa-bell"></i>
                    </div>
                    <div>
                        <p className="text-[12px] font-medium text-[#637381] mb-0.5">Tất cả</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[20px] font-black text-[#212B36]">24</span>
                            <span className="text-[12px] text-[#637381]">thông báo</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] cursor-pointer hover:border-[#1CD162] transition-colors">
                    <div className="w-12 h-12 rounded-[14px] bg-[#E4F8ED] text-[#1CD162] flex items-center justify-center text-[20px] shrink-0">
                        <i className="fa-regular fa-envelope"></i>
                    </div>
                    <div>
                        <p className="text-[12px] font-medium text-[#637381] mb-0.5">Chưa đọc</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[20px] font-black text-[#212B36]">5</span>
                            <span className="text-[12px] text-[#637381]">thông báo</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] cursor-pointer hover:border-[#FFB020] transition-colors">
                    <div className="w-12 h-12 rounded-[14px] bg-[#FFF9F3] text-[#FFB020] flex items-center justify-center text-[20px] shrink-0">
                        <i className="fa-solid fa-trophy"></i>
                    </div>
                    <div>
                        <p className="text-[12px] font-medium text-[#637381] mb-0.5">Trúng thưởng</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[20px] font-black text-[#212B36]">2</span>
                            <span className="text-[12px] text-[#637381]">thông báo</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-[#E5E8EB]">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                        <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto scrollbar-hide">
                            {tabs.map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-[13px] font-bold whitespace-nowrap rounded-lg transition-colors ${activeTab === tab ? 'text-[#ee1314] bg-[#FFF4F4]' : 'text-[#637381] hover:bg-[#F4F6F8]'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <select className="flex-1 lg:flex-none px-3 py-2 border border-[#E5E8EB] rounded-lg text-[13px] text-[#212B36] font-medium outline-none bg-white min-w-[120px]">
                                <option>Chưa đọc</option>
                                <option>Tất cả</option>
                            </select>
                            <div className="relative flex-1 lg:flex-none">
                                <select className="w-full pl-3 pr-8 py-2 border border-[#E5E8EB] rounded-lg text-[13px] text-[#212B36] font-medium outline-none bg-white min-w-[130px] appearance-none">
                                    <option>Tháng 3/2025</option>
                                </select>
                                <i className="fa-regular fa-calendar absolute right-3 top-1/2 -translate-y-1/2 text-[#919EAB] pointer-events-none text-[13px]"></i>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 border border-[#E5E8EB] rounded-lg text-[12px] font-bold text-[#637381] hover:bg-slate-50 transition-colors">
                            <i className="fa-solid fa-check text-[14px]"></i> Đánh dấu tất cả đã đọc
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 border border-[#FFE5E5] rounded-lg text-[12px] font-bold text-[#ee1314] hover:bg-[#FFF4F4] transition-colors">
                            <i className="fa-regular fa-trash-can text-[13px]"></i> Xóa đã đọc
                        </button>
                    </div>
                </div>

                {/* Notifications List (Timeline layout) */}
                <div className="p-6">
                    <div className="relative border-l-2 border-[#F4F6F8] ml-3 pl-8 pb-4">
                        
                        {/* Hôm nay */}
                        <div className="absolute w-3 h-3 bg-[#ee1314] rounded-full -left-[7px] top-1"></div>
                        <h3 className="text-[14px] font-black text-[#212B36] mb-4">Hôm nay</h3>

                        <div className="flex flex-col gap-4 mb-8">
                            {/* Card 1: Trúng thưởng */}
                            <div className="relative bg-[#FFF4F4] border border-[#FFE5E5] rounded-xl p-4 flex flex-col md:flex-row items-start gap-4 hover:shadow-sm transition-shadow cursor-pointer">
                                {/* Dot on timeline (virtual, we use absolute positioning if we want, but in design it's part of the line. We can just use the line dots for the day headers) */}
                                <div className="absolute w-2 h-2 bg-[#ee1314] rounded-full -left-[37.5px] top-8"></div>

                                <div className="w-12 h-12 rounded-full bg-white text-[#FFB020] flex items-center justify-center text-[20px] shrink-0 shadow-sm border border-[#FFE5E5]">
                                    <i className="fa-solid fa-trophy"></i>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-[14px] font-bold text-[#212B36]">Chúc mừng! Bạn đã trúng thưởng</h4>
                                        <span className="bg-white border border-[#ee1314] text-[#ee1314] text-[9px] font-bold px-1.5 py-0.5 rounded-full">MỚI</span>
                                    </div>
                                    <p className="text-[13px] text-[#454F5B] mb-0.5">Vé số Đồng Nai - Mã vé: <span className="font-semibold">CZ438008</span></p>
                                    <p className="text-[13px] text-[#454F5B]">Giá trị giải thưởng: <span className="text-[#ee1314] font-bold">215.000đ</span></p>
                                </div>
                                <div className="flex flex-col items-end gap-3 mt-1 md:mt-0 w-full md:w-auto">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[12px] text-[#637381]">13/03/2025 - 18:05</span>
                                        <div className="w-2 h-2 bg-[#ee1314] rounded-full"></div>
                                    </div>
                                    <button className="px-4 py-1.5 border border-[#ee1314] text-[#ee1314] text-[12px] font-bold rounded-lg hover:bg-[#ee1314] hover:text-white transition-colors">
                                        Xem chi tiết <i className="fa-solid fa-chevron-right text-[10px] ml-1"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Card 2: Kết quả */}
                            <div className="relative bg-white border border-[#E5E8EB] rounded-xl p-4 flex flex-col md:flex-row items-start gap-4 hover:shadow-sm transition-shadow cursor-pointer">
                                <div className="absolute w-2 h-2 bg-[#1CD162] rounded-full -left-[37.5px] top-8"></div>

                                <div className="w-12 h-12 rounded-full bg-[#E4F8ED] text-[#1CD162] flex items-center justify-center text-[20px] shrink-0">
                                    <i className="fa-solid fa-bullseye"></i>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-bold text-[#212B36] mb-1">Kết quả xổ số TP. Hồ Chí Minh đã có</h4>
                                    <p className="text-[13px] text-[#454F5B] mb-0.5">Kỳ quay: 13/03/2025</p>
                                    <p className="text-[13px] text-[#454F5B]">Số trúng: <span className="text-[#1CD162] font-bold">458120</span></p>
                                </div>
                                <div className="flex flex-col items-end gap-3 mt-1 md:mt-0 w-full md:w-auto">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[12px] text-[#637381]">13/03/2025 - 16:45</span>
                                        <div className="w-2 h-2 bg-[#ee1314] rounded-full"></div>
                                    </div>
                                    <button className="px-4 py-1.5 border border-[#1CD162] text-[#1CD162] text-[12px] font-bold rounded-lg hover:bg-[#1CD162] hover:text-white transition-colors">
                                        Xem kết quả <i className="fa-solid fa-chevron-right text-[10px] ml-1"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Hôm qua */}
                        <div className="absolute w-3 h-3 bg-[#919EAB] rounded-full -left-[7px] top-[260px] md:top-[225px]"></div>
                        <h3 className="text-[14px] font-black text-[#637381] mb-4 mt-8">Hôm qua</h3>

                        <div className="flex flex-col gap-4">
                            {/* Card 3: Thanh toán */}
                            <div className="relative bg-white border border-[#E5E8EB] rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer">
                                <div className="absolute w-2 h-2 bg-[#2065D1] rounded-full -left-[37.5px] top-1/2 -translate-y-1/2"></div>
                                
                                <div className="w-10 h-10 rounded-full bg-[#F0F5FF] text-[#2065D1] flex items-center justify-center text-[16px] shrink-0">
                                    <i className="fa-solid fa-receipt"></i>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-bold text-[#212B36]">Thanh toán thành công</h4>
                                    <div className="flex items-center gap-3 text-[13px] text-[#637381] mt-0.5">
                                        <span>Đơn hàng: <span className="font-semibold text-[#212B36]">J4604844</span></span>
                                        <span>Giá trị: <span className="font-semibold text-[#212B36]">990.000đ</span></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[#637381]">
                                    <span className="text-[12px]">12/03/2025 - 16:37</span>
                                    <i className="fa-solid fa-chevron-right text-[12px] opacity-50"></i>
                                </div>
                            </div>

                            {/* Card 4: Bảo mật */}
                            <div className="relative bg-white border border-[#E5E8EB] rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer">
                                <div className="absolute w-2 h-2 bg-[#9E5FFF] rounded-full -left-[37.5px] top-1/2 -translate-y-1/2"></div>
                                
                                <div className="w-10 h-10 rounded-full bg-[#F8F5FF] text-[#9E5FFF] flex items-center justify-center text-[16px] shrink-0">
                                    <i className="fa-solid fa-shield-halved"></i>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-bold text-[#212B36]">Xác thực email thành công</h4>
                                    <p className="text-[13px] text-[#637381] mt-0.5">Tài khoản của bạn đã được bảo mật tốt hơn</p>
                                </div>
                                <div className="flex items-center gap-3 text-[#637381]">
                                    <span className="text-[12px]">12/03/2025 - 09:21</span>
                                    <i className="fa-solid fa-chevron-right text-[12px] opacity-50"></i>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    {/* Empty state / End of list */}
                    <div className="text-center mt-8">
                        <p className="text-[13px] text-[#919EAB] font-medium">Không còn thông báo nào khác</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
