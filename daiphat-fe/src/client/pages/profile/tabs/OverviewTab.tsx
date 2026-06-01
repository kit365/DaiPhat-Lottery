import React from 'react';
import { Link } from 'react-router-dom';

export const OverviewTab = () => {
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="mb-14">
                <h1 className="text-[24px] font-black text-[#212B36] mb-1">Tổng quan tài khoản</h1>
                <p className="text-[14px] text-[#637381]">Chào mừng bạn trở lại, chúc bạn một ngày may mắn!</p>
            </div>
            {/* Stats Row */}
            <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1 */}
                    <div className="bg-[#FFF5F5] rounded-xl p-5 flex items-center gap-4 relative overflow-hidden bg-center bg-cover" id="stat-1-bg">
                        <div className="w-12 h-12 rounded-full bg-[#FF4842] text-white flex items-center justify-center text-xl shrink-0 z-10">
                            <i className="fa-solid fa-file-invoice-dollar"></i>
                        </div>
                        <div className="z-10">
                            <div className="text-[24px] font-bold text-[#212B36] leading-none mb-1">18</div>
                            <div className="text-[13px] text-[#637381] mb-1">Tổng đơn hàng</div>
                            <div className="text-[11px] font-medium text-[#637381]"><span className="text-[#FF4842]">↑ 12%</span> so với tháng trước</div>
                        </div>
                    </div>
                    {/* Card 2 */}
                    <div className="bg-[#F4FBFA] rounded-xl p-5 flex items-center gap-4 relative overflow-hidden bg-center bg-cover" id="stat-2-bg">
                        <div className="w-12 h-12 rounded-full bg-[#1CD162] text-white flex items-center justify-center text-xl shrink-0 z-10">
                            <i className="fa-solid fa-ticket"></i>
                        </div>
                        <div className="z-10">
                            <div className="text-[24px] font-bold text-[#212B36] leading-none mb-1">28</div>
                            <div className="text-[13px] text-[#637381] mb-1">Vé đã mua</div>
                            <div className="text-[11px] font-medium text-[#637381]"><span className="text-[#1CD162]">↑ 15%</span> so với tháng trước</div>
                        </div>
                    </div>
                    {/* Card 3 */}
                    <div className="bg-[#FFF9F3] rounded-xl p-5 flex items-center gap-4 relative overflow-hidden bg-center bg-cover" id="stat-3-bg">
                        <div className="w-12 h-12 rounded-full bg-[#FFB020] text-white flex items-center justify-center text-xl shrink-0 z-10">
                            <i className="fa-solid fa-trophy"></i>
                        </div>
                        <div className="z-10">
                            <div className="text-[24px] font-bold text-[#212B36] leading-none mb-1">2</div>
                            <div className="text-[13px] text-[#637381] mb-1">Vé trúng thưởng</div>
                            <div className="text-[11px] font-medium text-[#637381]"><span className="text-[#1CD162]">↑ 100%</span> so với tháng trước</div>
                        </div>
                    </div>
                    {/* Card 4 */}
                    <div className="bg-[#F8F5FF] rounded-xl p-5 flex items-center gap-4 relative overflow-hidden bg-center bg-cover" id="stat-4-bg">
                        <div className="w-12 h-12 rounded-[14px] bg-[#9E5FFF] text-white flex items-center justify-center text-xl shrink-0 z-10">
                            <i className="fa-solid fa-star"></i>
                        </div>
                        <div className="z-10">
                            <div className="text-[24px] font-bold text-[#212B36] leading-none mb-1">7</div>
                            <div className="text-[13px] text-[#637381] mb-1">Số đánh giá</div>
                            <div className="text-[11px] font-medium text-[#637381]"><span className="text-[#FF4842]">4.8/5</span> trung bình</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders - 2 cols */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[16px] font-bold text-[#212B36]">Đơn hàng gần đây</h3>
                        <Link to="/profile/history" className="text-[13px] text-[#637381] hover:text-[#ee1314]">Xem tất cả &gt;</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead>
                                <tr className="text-[#637381] border-b border-[#E5E8EB]">
                                    <th className="pb-3 font-medium">Mã đơn hàng</th>
                                    <th className="pb-3 font-medium">Ngày đặt</th>
                                    <th className="pb-3 font-medium text-center">Số lượng</th>
                                    <th className="pb-3 font-medium text-right">Tổng tiền</th>
                                    <th className="pb-3 font-medium text-right">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="text-[#212B36]">
                                {/* Rows */}
                                <tr className="border-b border-[#F4F6F8]">
                                    <td className="py-3 font-medium">J4604844</td>
                                    <td className="py-3 text-[#637381]">13/03/2025 - 16:37</td>
                                    <td className="py-3 text-center">2 vé</td>
                                    <td className="py-3 text-right font-medium">990.000đ</td>
                                    <td className="py-3 text-right"><span className="text-[#FFB020] bg-[#FFF9F3] px-2 py-1 rounded-md text-[11px] font-semibold inline-block">Chờ xác nhận</span></td>
                                </tr>
                                <tr className="border-b border-[#F4F6F8]">
                                    <td className="py-3 font-medium">CZ438008</td>
                                    <td className="py-3 text-[#637381]">13/03/2025 - 11:03</td>
                                    <td className="py-3 text-center">1 vé</td>
                                    <td className="py-3 text-right font-medium">215.000đ</td>
                                    <td className="py-3 text-right"><span className="text-[#1CD162] bg-[#F4FBFA] px-2 py-1 rounded-md text-[11px] font-semibold inline-block">Thành công</span></td>
                                </tr>
                                <tr className="border-b border-[#F4F6F8]">
                                    <td className="py-3 font-medium">RP106810</td>
                                    <td className="py-3 text-[#637381]">28/02/2025 - 10:34</td>
                                    <td className="py-3 text-center">3 vé</td>
                                    <td className="py-3 text-right font-medium">915.700đ</td>
                                    <td className="py-3 text-right"><span className="text-[#1CD162] bg-[#F4FBFA] px-2 py-1 rounded-md text-[11px] font-semibold inline-block">Thành công</span></td>
                                </tr>
                                <tr className="border-b border-[#F4F6F8]">
                                    <td className="py-3 font-medium">CQ975101</td>
                                    <td className="py-3 text-[#637381]">28/02/2025 - 10:28</td>
                                    <td className="py-3 text-center">1 vé</td>
                                    <td className="py-3 text-right font-medium">95.700đ</td>
                                    <td className="py-3 text-right"><span className="text-[#FFB020] bg-[#FFF9F3] px-2 py-1 rounded-md text-[11px] font-semibold inline-block">Chờ xác nhận</span></td>
                                </tr>
                                <tr>
                                    <td className="py-3 font-medium">KB227418</td>
                                    <td className="py-3 text-[#637381]">28/02/2025 - 10:27</td>
                                    <td className="py-3 text-center">1 vé</td>
                                    <td className="py-3 text-right font-medium">95.700đ</td>
                                    <td className="py-3 text-right"><span className="text-[#1CD162] bg-[#F4FBFA] px-2 py-1 rounded-md text-[11px] font-semibold inline-block">Thành công</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions - 1 col */}
                <div className="bg-white rounded-xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] p-5">
                    <h3 className="text-[16px] font-bold text-[#212B36] mb-4">Thao tác nhanh</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <Link to="/buy-ticket" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-[#E5E8EB] hover:border-[#ee1314] hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#FFF4F4] flex items-center justify-center text-[#ee1314] group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-ticket-simple text-lg"></i>
                            </div>
                            <span className="text-[12px] font-medium text-[#454F5B] text-center">Mua vé số</span>
                        </Link>
                        <Link to="/profile/tickets" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-[#E5E8EB] hover:border-[#FFB020] hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#FFF9F3] flex items-center justify-center text-[#FFB020] group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-wallet text-lg"></i>
                            </div>
                            <span className="text-[12px] font-medium text-[#454F5B] text-center">Vé của tôi</span>
                        </Link>
                        <Link to="/" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-[#E5E8EB] hover:border-[#1CD162] hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#F4FBFA] flex items-center justify-center text-[#1CD162] group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-chart-pie text-lg"></i>
                            </div>
                            <span className="text-[12px] font-medium text-[#454F5B] text-center">Kết quả xổ số</span>
                        </Link>
                        <Link to="/" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-[#E5E8EB] hover:border-[#2065D1] hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#F0F5FF] flex items-center justify-center text-[#2065D1] group-hover:scale-110 transition-transform">
                                <i className="fa-regular fa-calendar-days text-lg"></i>
                            </div>
                            <span className="text-[12px] font-medium text-[#454F5B] text-center">Lịch mở thưởng</span>
                        </Link>
                        <Link to="/" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-[#E5E8EB] hover:border-[#FF4842] hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#FFF5F5] flex items-center justify-center text-[#FF4842] group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-gift text-lg"></i>
                            </div>
                            <span className="text-[12px] font-medium text-[#454F5B] text-center">Khuyến mãi</span>
                        </Link>
                        <Link to="/" className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-[#E5E8EB] hover:border-[#9E5FFF] hover:shadow-sm transition-all group">
                            <div className="w-10 h-10 rounded-full bg-[#F8F5FF] flex items-center justify-center text-[#9E5FFF] group-hover:scale-110 transition-transform">
                                <i className="fa-solid fa-headset text-lg"></i>
                            </div>
                            <span className="text-[12px] font-medium text-[#454F5B] text-center">Hỗ trợ</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Tickets */}
                <div className="bg-white rounded-xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[16px] font-bold text-[#212B36]">Vé số gần đây</h3>
                        <Link to="/profile/tickets" className="text-[13px] text-[#637381] hover:text-[#ee1314]">Xem tất cả &gt;</Link>
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: "Vé số TP. Hồ Chí Minh", date: "13/03/2025 - 16:37", code: "458120", qty: "2 vé - 990.000đ", color: "text-[#ee1314]", bg: "bg-[#FFF4F4]" },
                            { name: "Vé số Đồng Nai", date: "13/03/2025 - 11:03", code: "112233", qty: "1 vé - 215.000đ", color: "text-[#1CD162]", bg: "bg-[#F4FBFA]" },
                            { name: "Vé số Cần Thơ", date: "28/02/2025 - 10:34", code: "998877", qty: "3 vé - 915.700đ", color: "text-[#2065D1]", bg: "bg-[#F0F5FF]" },
                            { name: "Vé số Sóc Trăng", date: "28/02/2025 - 10:28", code: "001122", qty: "1 vé - 95.700đ", color: "text-[#FFB020]", bg: "bg-[#FFF9F3]" },
                            { name: "Vé số Tây Ninh", date: "28/02/2025 - 10:27", code: "334455", qty: "1 vé - 95.700đ", color: "text-[#9E5FFF]", bg: "bg-[#F8F5FF]" }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#F4F6F8] border border-[#E5E8EB] overflow-hidden">
                                    <img src="https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png" alt="Station" className="w-7 h-7 object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold text-[#212B36] truncate">{item.name}</div>
                                    <div className="text-[11px] text-[#637381]">{item.date}</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[14px] font-black text-[#ee1314]">{item.code}</div>
                                    <div className="text-[11px] text-[#637381]">{item.qty}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Spending Stats - 2 col */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#E5E8EB] p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[16px] font-bold text-[#212B36]">Thống kê chi tiêu theo nhà đài</h3>
                        <select className="border border-[#E5E8EB] rounded-lg px-3 py-1.5 text-[13px] text-[#454F5B] outline-none">
                            <option>Tháng 3/2025</option>
                        </select>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row items-center gap-8 justify-center">
                        {/* Placeholder for Donut Chart */}
                        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center rounded-full bg-[#F4F6F8]">
                            {/* Conic Gradient for the pie chart slices */}
                            <div 
                                className="absolute inset-0 rounded-full" 
                                style={{ 
                                    background: `conic-gradient(
                                        #ee1314 0% 48%, 
                                        #FFB020 48% 70%, 
                                        #2065D1 70% 85%, 
                                        #1CD162 85% 95%, 
                                        #9E5FFF 95% 100%
                                    )` 
                                }}
                            ></div>
                            
                            {/* Inner white circle to create the "donut" hole */}
                            <div className="text-center bg-white w-36 h-36 rounded-full flex flex-col items-center justify-center relative z-10">
                                <div className="text-[18px] font-black text-[#212B36]">2.311.700đ</div>
                                <div className="text-[11px] text-[#637381]">Tổng chi tiêu</div>
                            </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex-1 w-full space-y-3">
                            <div className="flex items-center gap-6 text-[13px]">
                                <div className="flex items-center gap-2 flex-1 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#ee1314]"></span><span className="text-[#454F5B] truncate">Vé số TP. Hồ Chí Minh</span></div>
                                <div className="text-[#637381] w-[40px] text-right shrink-0">48%</div>
                                <div className="font-medium text-[#212B36] w-[85px] text-right shrink-0">1.100.000đ</div>
                            </div>
                            <div className="flex items-center gap-6 text-[13px]">
                                <div className="flex items-center gap-2 flex-1 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#FFB020]"></span><span className="text-[#454F5B] truncate">Vé số Đồng Nai</span></div>
                                <div className="text-[#637381] w-[40px] text-right shrink-0">22%</div>
                                <div className="font-medium text-[#212B36] w-[85px] text-right shrink-0">500.000đ</div>
                            </div>
                            <div className="flex items-center gap-6 text-[13px]">
                                <div className="flex items-center gap-2 flex-1 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#2065D1]"></span><span className="text-[#454F5B] truncate">Vé số Cần Thơ</span></div>
                                <div className="text-[#637381] w-[40px] text-right shrink-0">15%</div>
                                <div className="font-medium text-[#212B36] w-[85px] text-right shrink-0">350.000đ</div>
                            </div>
                            <div className="flex items-center gap-6 text-[13px]">
                                <div className="flex items-center gap-2 flex-1 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#1CD162]"></span><span className="text-[#454F5B] truncate">Vé số Sóc Trăng</span></div>
                                <div className="text-[#637381] w-[40px] text-right shrink-0">10%</div>
                                <div className="font-medium text-[#212B36] w-[85px] text-right shrink-0">230.000đ</div>
                            </div>
                            <div className="flex items-center gap-6 text-[13px]">
                                <div className="flex items-center gap-2 flex-1 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#9E5FFF]"></span><span className="text-[#454F5B] truncate">Vé số khác</span></div>
                                <div className="text-[#637381] w-[40px] text-right shrink-0">5%</div>
                                <div className="font-medium text-[#212B36] w-[85px] text-right shrink-0">131.700đ</div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 text-center text-[13px] text-[#ee1314] bg-[#FFF4F4] py-2 rounded-lg">
                        Chi tiêu tăng <span className="font-bold">12%</span> so với tháng trước
                    </div>
                </div>
            </div>

        </div>
    );
};
