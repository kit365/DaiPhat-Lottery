import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const TicketsTab = () => {
    // Tạm fix cứng trạng thái để show UI Detail
    const [viewDetail, setViewDetail] = useState(true);

    if (viewDetail) {
        return (
            <div className="flex flex-col gap-6 w-full font-client-main">
                {/* Back Link */}
                <button 
                    onClick={() => setViewDetail(false)}
                    className="flex items-center gap-2 text-[#ee1314] font-bold text-[14px] hover:underline w-max bg-transparent border-none cursor-pointer outline-none"
                >
                    <i className="fa-solid fa-chevron-left text-[12px]"></i>
                    Quay lại danh sách vé
                </button>

                {/* Main Ticket Info Card */}
                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[16px] bg-[#F4FBFA] text-[#1CD162] flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-ticket-simple text-[28px]"></i>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1.5">
                                <h3 className="text-[18px] font-black text-[#212B36] m-0">Vé số Đồng Nai</h3>
                                <div className="bg-[#E4F8ED] text-[#1CD162] px-2.5 py-1 rounded-md text-[11px] font-bold">
                                    Trúng thưởng
                                </div>
                            </div>
                            <p className="text-[13px] text-[#637381] mb-0.5">Ngày mở thưởng: Thứ Sáu, 20/06/2026</p>
                            <p className="text-[13px] text-[#637381] m-0">Kỳ vé: 20/06/2026</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 md:gap-20 w-full md:w-auto">
                        <div className="flex flex-col">
                            <span className="text-[13px] text-[#637381] mb-1">Mã vé</span>
                            <span className="text-[20px] font-black text-[#1CD162]">CZ438008</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] text-[#637381] mb-1">Giá vé</span>
                            <span className="text-[18px] font-bold text-[#212B36]">10.000đ</span>
                        </div>
                    </div>
                </div>

                {/* Reward Info Card */}
                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-[50px] h-[50px] rounded-full bg-[#1CD162] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#1CD162]/30">
                            <i className="fa-solid fa-trophy text-[22px]"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] text-[#637381] mb-1">Kết quả đối chiếu</span>
                            <span className="text-[18px] font-bold text-[#1CD162]">Trúng thưởng</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 md:gap-20 w-full md:w-auto">
                        <div className="flex flex-col">
                            <span className="text-[13px] text-[#637381] mb-1">Giải trúng</span>
                            <span className="text-[16px] font-bold text-[#212B36]">Giải tám</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] text-[#637381] mb-1">Tiền thưởng</span>
                            <span className="text-[18px] font-bold text-[#1CD162]">100.000đ</span>
                        </div>
                    </div>

                    <button className="w-full md:w-auto px-5 py-2.5 bg-white border border-[#ee1314] text-[#ee1314] font-bold rounded-xl text-[14px] hover:bg-[#FFF4F4] transition-colors cursor-pointer mt-4 md:mt-0">
                        Xem kết quả kỳ quay
                    </button>
                </div>

                {/* Ticket Details List */}
                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                    <h4 className="text-[#ee1314] font-bold text-[14px] uppercase mb-6 tracking-wide">THÔNG TIN VÉ</h4>
                    
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB] last:border-0">
                            <span className="text-[#637381] text-[14px]">Ngày mua</span>
                            <span className="text-[#212B36] font-medium text-[14px]">20/06/2026 - 15:42:18</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB] last:border-0">
                            <span className="text-[#637381] text-[14px]">Kỳ vé</span>
                            <span className="text-[#212B36] font-medium text-[14px]">20/06/2026</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB] last:border-0">
                            <span className="text-[#637381] text-[14px]">Trạng thái</span>
                            <div className="bg-[#E4F8ED] text-[#1CD162] px-3 py-1 rounded-md text-[13px] font-bold">
                                Trúng thưởng
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB] last:border-0">
                            <span className="text-[#637381] text-[14px]">Giá vé</span>
                            <span className="text-[#212B36] font-medium text-[14px]">10.000đ</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-dashed border-[#E5E8EB] last:border-0">
                            <span className="text-[#637381] text-[14px]">Mã giao dịch (Order ID)</span>
                            <div className="flex items-center gap-2 text-[#212B36] font-medium text-[14px]">
                                DP25062015421888
                                <i className="fa-regular fa-copy text-[#919EAB] cursor-pointer hover:text-[#212B36] transition-colors" title="Sao chép"></i>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Notification */}
                <div className="bg-[#FFF4F4] rounded-2xl p-4 flex items-center justify-between border border-[#ee1314]/10">
                    <div className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-info text-[#ee1314] text-[20px]"></i>
                        <span className="text-[#454F5B] text-[14px]">Tiền thưởng sẽ được cộng vào số dư tài khoản của bạn.</span>
                    </div>
                    <button className="text-[#ee1314] font-bold text-[14px] flex items-center gap-2 hover:underline bg-transparent border-none cursor-pointer outline-none">
                        Xem lịch sử nhận thưởng <i className="fa-solid fa-chevron-right text-[12px]"></i>
                    </button>
                </div>
            </div>
        );
    }

    const [activeTab, setActiveTab] = useState('Tất cả');

    const ticketTabs = ['Tất cả', 'Chờ quay số', 'Trúng thưởng', 'Chưa trúng'];

    const tickets = [
        {
            id: 1,
            region: 'Vé số TP. Hồ Chí Minh',
            date: '13/03/2025',
            period: '13/03/2025',
            code: 'J4604844',
            numbers: ['12', '25', '36', '45', '52', '89'],
            price: '10.000đ',
            status: 'Chờ quay số',
            color: '#ee1314', // Red
            bgColor: '#FFF4F4'
        },
        {
            id: 2,
            region: 'Vé số Đồng Nai',
            date: '13/03/2025',
            period: '13/03/2025',
            code: 'CZ438008',
            numbers: ['03', '17', '28', '39', '41', '66'],
            price: '10.000đ',
            status: 'Trúng thưởng',
            prize: '215.000đ',
            color: '#1CD162', // Green
            bgColor: '#F4FBFA'
        },
        {
            id: 3,
            region: 'Vé số Cần Thơ',
            date: '12/03/2025',
            period: '12/03/2025',
            code: 'RP106810',
            numbers: ['07', '14', '26', '33', '58', '91'],
            price: '10.000đ',
            status: 'Chưa trúng',
            color: '#2065D1', // Blue
            bgColor: '#F0F5FF'
        },
        {
            id: 4,
            region: 'Vé số Sóc Trăng',
            date: '12/03/2025',
            period: '12/03/2025',
            code: 'CQ975101',
            numbers: ['11', '22', '34', '47', '59', '80'],
            price: '10.000đ',
            status: 'Chưa trúng',
            color: '#9E5FFF', // Purple
            bgColor: '#F8F5FF'
        },
        {
            id: 5,
            region: 'Vé số Tây Ninh',
            date: '10/03/2025',
            period: '10/03/2025',
            code: 'KB227418',
            numbers: ['02', '16', '24', '38', '64', '75'],
            price: '10.000đ',
            status: 'Chưa trúng',
            color: '#FFB020', // Orange
            bgColor: '#FFF9F3'
        }
    ];

    const getStatusBadge = (status: string, prize?: string) => {
        if (status === 'Chờ quay số') {
            return (
                <div className="flex items-center gap-1 bg-[#FFF9F3] text-[#FFB020] px-2.5 py-1 rounded-md text-[11px] font-bold">
                    Chờ quay số <i className="fa-solid fa-clock text-[10px]"></i>
                </div>
            );
        }
        if (status === 'Trúng thưởng') {
            return (
                <div className="flex flex-col items-end gap-1">
                    <div className="bg-[#E4F8ED] text-[#1CD162] px-2.5 py-1 rounded-md text-[11px] font-bold">
                        Trúng thưởng
                    </div>
                    <div className="text-[11px] text-[#637381]">
                        Nhận thưởng: <span className="text-[#1CD162] font-bold">{prize}</span>
                    </div>
                </div>
            );
        }
        return (
            <div className="bg-[#FFF4F4] text-[#ee1314] px-2.5 py-1 rounded-md text-[11px] font-bold">
                Chưa trúng
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Main Card */}
            <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                {/* Filters */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 border-b border-[#E5E8EB]">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto scrollbar-hide pb-2 lg:pb-0">
                        {ticketTabs.map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-[14px] font-bold whitespace-nowrap rounded-lg transition-colors ${activeTab === tab ? 'text-[#ee1314] bg-[#FFF4F4]' : 'text-[#637381] hover:bg-[#F4F6F8]'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    
                    {/* Selects & Search */}
                    <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
                        <select className="px-3 py-2 border border-[#E5E8EB] rounded-lg text-[13px] text-[#212B36] font-medium outline-none cursor-pointer bg-white min-w-[120px]">
                            <option>Tất cả đài</option>
                        </select>
                        <select className="px-3 py-2 border border-[#E5E8EB] rounded-lg text-[13px] text-[#212B36] font-medium outline-none cursor-pointer bg-white min-w-[130px]">
                            <option>Tháng 3/2025</option>
                        </select>
                        <div className="relative min-w-[180px]">
                            <input 
                                type="text" 
                                placeholder="Tìm mã vé" 
                                className="w-full pl-9 pr-3 py-2 border border-[#E5E8EB] rounded-lg text-[13px] outline-none focus:border-[#ee1314] transition-colors"
                            />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#919EAB] text-[13px]"></i>
                        </div>
                    </div>
                </div>

                {/* Ticket List */}
                <div className="flex flex-col">
                    {tickets.map((ticket, index) => (
                        <div 
                            key={ticket.id} 
                            onClick={() => setViewDetail(true)}
                            className="flex flex-col md:flex-row items-start md:items-center p-5 border-b border-[#F4F6F8] gap-4 md:gap-6 hover:bg-[#FAFBFC] transition-colors cursor-pointer group"
                        >
                            
                            {/* Icon & Region Info */}
                            <div className="flex items-center gap-4 min-w-[240px]">
                                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: ticket.bgColor, color: ticket.color }}>
                                    <i className="fa-solid fa-ticket-simple text-[20px]"></i>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-[14px] font-bold text-[#212B36] mb-0.5">{ticket.region}</h4>
                                    <p className="text-[11px] text-[#637381]">Ngày mở thưởng: {ticket.date}</p>
                                    <p className="text-[11px] text-[#637381]">Kỳ vé: {ticket.period}</p>
                                </div>
                            </div>

                            {/* Ticket Code */}
                            <div className="flex flex-col md:w-[120px]">
                                <span className="text-[11px] text-[#637381] mb-1">Mã vé</span>
                                <span className="text-[15px] font-black" style={{ color: ticket.color }}>{ticket.code}</span>
                            </div>

                            {/* Numbers */}
                            <div className="flex flex-col flex-1">
                                <span className="text-[11px] text-[#637381] mb-1">Số vé</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {ticket.numbers.map((num, i) => (
                                        <div key={i} className="w-7 h-7 rounded-full bg-[#F4F6F8] flex items-center justify-center text-[12px] font-bold text-[#212B36]">
                                            {num}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Price */}
                            <div className="flex flex-col md:w-[100px] shrink-0">
                                <span className="text-[11px] text-[#637381] mb-1">Giá vé</span>
                                <span className="text-[14px] font-bold text-[#212B36]">{ticket.price}</span>
                            </div>

                            {/* Status */}
                            <div className="flex flex-col items-start md:items-end md:w-[130px] shrink-0">
                                <span className="text-[11px] text-[#637381] mb-1">Trạng thái</span>
                                {getStatusBadge(ticket.status, ticket.prize)}
                            </div>

                            {/* Chevron */}
                            <div className="hidden md:flex items-center justify-center text-[#919EAB] group-hover:text-[#ee1314] transition-colors shrink-0 pl-2">
                                <i className="fa-solid fa-chevron-right text-[12px]"></i>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center py-6 gap-2">
                    <button className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#919EAB] hover:bg-[#F4F6F8] transition-colors">
                        <i className="fa-solid fa-chevron-left text-[12px]"></i>
                    </button>
                    <button className="w-8 h-8 rounded-lg bg-[#ee1314] flex items-center justify-center text-white font-bold text-[13px] shadow-sm">
                        1
                    </button>
                    <button className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#212B36] font-medium text-[13px] hover:bg-[#F4F6F8] transition-colors">
                        2
                    </button>
                    <button className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#212B36] font-medium text-[13px] hover:bg-[#F4F6F8] transition-colors">
                        3
                    </button>
                    <button className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#212B36] font-medium text-[13px] hover:bg-[#F4F6F8] transition-colors">
                        4
                    </button>
                    <span className="text-[#919EAB] px-1">...</span>
                    <button className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#212B36] font-medium text-[13px] hover:bg-[#F4F6F8] transition-colors">
                        10
                    </button>
                    <button className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#212B36] hover:text-[#ee1314] hover:border-[#ee1314] hover:bg-[#FFF4F4] transition-colors">
                        <i className="fa-solid fa-chevron-right text-[12px]"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};
