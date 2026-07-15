import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../../../components/common/Pagination';

export const TicketsTab = () => {
    const [page, setPage] = useState(1);
    // Tạm fix cứng trạng thái để show UI Detail
    const [viewDetail, setViewDetail] = useState(true);

    if (viewDetail) {
        return (
            <div className="flex flex-col gap-6 w-full font-client-main pb-24 md:pb-0">
                {/* Back Link (Desktop only) */}
                <button 
                    onClick={() => setViewDetail(false)}
                    className="hidden md:flex items-center gap-2 text-[#ee1314] font-bold text-[14px] hover:underline w-max bg-transparent border-none cursor-pointer outline-none"
                >
                    <i className="fa-solid fa-chevron-left text-[12px]"></i>
                    Quay lại danh sách vé
                </button>

                {/* Main Ticket Info Card */}
                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5 md:gap-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-5">
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-[14px] md:rounded-[16px] bg-[#F4FBFA] text-[#1CD162] flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-ticket-simple text-[24px] md:text-[28px]"></i>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <h3 className="text-[16px] md:text-[18px] font-black text-[#212B36] m-0">Vé số Đồng Nai</h3>
                                    <div className="bg-[#E4F8ED] text-[#1CD162] px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold">
                                        Trúng thưởng
                                    </div>
                                </div>
                                <p className="text-[12px] md:text-[13px] text-[#637381] mb-0.5">Ngày mở thưởng: Thứ Sáu, 20/06/2026</p>
                                <p className="text-[12px] md:text-[13px] text-[#637381] m-0">Kỳ vé: 20/06/2026</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between w-full md:w-auto md:justify-end md:gap-16 bg-[#F8F9FA] md:bg-transparent p-3 md:p-0 rounded-xl">
                            <div className="flex flex-col">
                                <span className="text-[11px] md:text-[13px] text-[#637381] mb-1">Mã vé</span>
                                <span className="text-[16px] md:text-[20px] font-black text-[#1CD162]">CZ438008</span>
                            </div>
                            <div className="flex flex-col items-end md:items-start">
                                <span className="text-[11px] md:text-[13px] text-[#637381] mb-1">Giá vé</span>
                                <span className="text-[16px] md:text-[18px] font-bold text-[#212B36]">10.000đ</span>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Numbers */}
                    <div className="border-t border-dashed border-[#E5E8EB] pt-5">
                        <span className="text-[13px] text-[#637381] block mb-3 font-medium">Bộ số đã chọn</span>
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            {['03', '17', '28', '39', '41', '66'].map((num, i) => (
                                <div key={i} className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-[#F4F6F8] border border-[#E5E8EB] shadow-[0_2px_4px_rgb(0,0,0,0.02)] flex items-center justify-center text-[16px] md:text-[20px] font-black text-[#212B36]">
                                    {num}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reward Info Card */}
                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">
                    <div className="flex items-center gap-4 md:gap-5 w-full md:w-auto">
                        <div className="w-[44px] h-[44px] md:w-[50px] md:h-[50px] rounded-full bg-[#1CD162] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#1CD162]/30">
                            <i className="fa-solid fa-trophy text-[20px] md:text-[22px]"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] md:text-[13px] text-[#637381] mb-0.5">Kết quả đối chiếu</span>
                            <span className="text-[16px] md:text-[18px] font-bold text-[#1CD162]">Trúng thưởng</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto md:justify-end md:gap-16 bg-[#F4FBFA] md:bg-transparent p-3 md:p-0 rounded-xl border border-[#E4F8ED] md:border-none">
                        <div className="flex flex-col">
                            <span className="text-[11px] md:text-[13px] text-[#637381] mb-1">Giải trúng</span>
                            <span className="text-[14px] md:text-[16px] font-bold text-[#212B36]">Giải tám</span>
                        </div>
                        <div className="flex flex-col items-end md:items-start">
                            <span className="text-[11px] md:text-[13px] text-[#637381] mb-1">Tiền thưởng</span>
                            <span className="text-[16px] md:text-[18px] font-bold text-[#1CD162]">100.000đ</span>
                        </div>
                    </div>

                    <button className="w-full md:w-auto px-5 py-2.5 bg-white border border-[#ee1314] text-[#ee1314] font-bold rounded-xl text-[14px] hover:bg-[#FFF4F4] transition-colors cursor-pointer">
                        Xem kết quả kỳ quay
                    </button>
                </div>

                {/* Ticket Details List */}
                <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
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
                <div className="bg-[#FFF4F4] rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border border-[#ee1314]/10 mb-6 md:mb-0">
                    <div className="flex items-start md:items-center gap-3">
                        <i className="fa-solid fa-circle-info text-[#ee1314] text-[18px] md:text-[20px] mt-0.5 md:mt-0"></i>
                        <span className="text-[#454F5B] text-[13px] md:text-[14px] leading-relaxed">Tiền thưởng sẽ được cộng vào số dư tài khoản của bạn.</span>
                    </div>
                    <button className="text-[#ee1314] font-bold text-[13px] md:text-[14px] flex items-center gap-2 hover:underline w-full md:w-auto justify-end bg-transparent border-none cursor-pointer outline-none">
                        Xem lịch sử nhận thưởng <i className="fa-solid fa-chevron-right text-[11px] md:text-[12px]"></i>
                    </button>
                </div>

                {/* Desktop: Actions */}
                <div className="hidden md:flex justify-end gap-4 mt-2">
                    <button className="px-6 py-2.5 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] shadow-sm hover:bg-[#c80f11] transition-colors cursor-pointer flex items-center gap-2">
                        <i className="fa-solid fa-cart-plus"></i>
                        Mua lại bộ số này
                    </button>
                </div>

                {/* Mobile: Fixed Bottom Actions */}
                <div className="md:hidden fixed bottom-[70px] lg:bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E8EB] flex gap-3 z-30 shadow-[0_-4px_20px_rgb(0,0,0,0.05)]">
                    <button onClick={() => setViewDetail(false)} className="flex-1 py-3 bg-[#F4F6F8] text-[#212B36] font-bold rounded-xl text-[14px] transition-colors cursor-pointer text-center">
                        Quay lại
                    </button>
                    <button className="flex-[2] py-3 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] shadow-sm transition-colors cursor-pointer text-center flex items-center justify-center gap-2">
                        <i className="fa-solid fa-cart-plus text-[16px]"></i>
                        Mua nhanh
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
                            onClick={() => {
                                if (window.innerWidth >= 768) {
                                    setViewDetail(true);
                                }
                            }}
                            className="flex flex-col md:flex-row items-stretch md:items-center p-4 md:p-5 border-b border-[#F4F6F8] gap-4 md:gap-6 hover:bg-[#FAFBFC] transition-colors cursor-pointer md:cursor-pointer group"
                        >
                            {/* Mobile Layout: Header (Icon, Region, Status) */}
                            <div className="flex md:hidden items-start justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: ticket.bgColor, color: ticket.color }}>
                                        <i className="fa-solid fa-ticket-simple text-[16px]"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-[14px] font-bold text-[#212B36] mb-0.5">{ticket.region}</h4>
                                        <p className="text-[11px] text-[#637381]">Kỳ: {ticket.period}</p>
                                    </div>
                                </div>
                                <div>
                                    {getStatusBadge(ticket.status, ticket.prize)}
                                </div>
                            </div>

                            {/* Desktop Layout: Icon & Region Info */}
                            <div className="hidden md:flex items-center gap-4 min-w-[240px]">
                                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: ticket.bgColor, color: ticket.color }}>
                                    <i className="fa-solid fa-ticket-simple text-[20px]"></i>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-[14px] font-bold text-[#212B36] mb-0.5">{ticket.region}</h4>
                                    <p className="text-[11px] text-[#637381]">Ngày mở thưởng: {ticket.date}</p>
                                    <p className="text-[11px] text-[#637381]">Kỳ vé: {ticket.period}</p>
                                </div>
                            </div>

                            {/* Desktop: Ticket Code */}
                            <div className="hidden md:flex flex-col w-[120px]">
                                <span className="text-[11px] text-[#637381] mb-1">Mã vé</span>
                                <span className="text-[15px] font-black" style={{ color: ticket.color }}>{ticket.code}</span>
                            </div>

                            {/* Desktop: Numbers */}
                            <div className="hidden md:flex flex-col flex-1">
                                <span className="text-[11px] text-[#637381] mb-1">Số vé</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {ticket.numbers.map((num, i) => (
                                        <div key={i} className="w-7 h-7 rounded-full bg-[#F4F6F8] flex items-center justify-center text-[12px] font-bold text-[#212B36]">
                                            {num}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Desktop: Price */}
                            <div className="hidden md:flex flex-col w-[100px] shrink-0">
                                <span className="text-[11px] text-[#637381] mb-1">Giá vé</span>
                                <span className="text-[14px] font-bold text-[#212B36]">{ticket.price}</span>
                            </div>

                            {/* Desktop: Status */}
                            <div className="hidden md:flex flex-col items-start md:items-end w-[130px] shrink-0">
                                <span className="text-[11px] text-[#637381] mb-1">Trạng thái</span>
                                {getStatusBadge(ticket.status, ticket.prize)}
                            </div>

                            {/* Mobile Layout: Body (Code, Price, Numbers) */}
                            <div className="flex md:hidden flex-col gap-3 bg-[#F4F6F8] rounded-xl p-3 w-full">
                                <div className="flex justify-between items-center border-b border-[#E5E8EB] pb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-[#637381] uppercase tracking-wider">Mã vé</span>
                                        <span className="text-[13px] font-black" style={{ color: ticket.color }}>{ticket.code}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-[#637381] uppercase tracking-wider">Giá vé</span>
                                        <span className="text-[13px] font-bold text-[#212B36]">{ticket.price}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-[#637381] uppercase tracking-wider">Bộ số</span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {ticket.numbers.map((num, i) => (
                                            <div key={i} className="w-7 h-7 rounded-full bg-white shadow-[0_2px_4px_rgb(0,0,0,0.05)] border border-[#E5E8EB] flex items-center justify-center text-[12px] font-bold text-[#212B36]">
                                                {num}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Layout: Action Buttons */}
                            <div className="flex md:hidden items-center justify-between gap-3 w-full pt-1">
                                <button 
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 py-2.5 bg-white border border-[#E5E8EB] text-[#212B36] rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_2px_4px_rgb(0,0,0,0.02)] active:bg-[#F4F6F8] transition-colors"
                                >
                                    <i className="fa-solid fa-cart-plus text-[#ee1314]"></i>
                                    Thêm giỏ
                                </button>
                                <button 
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 py-2.5 bg-[#ee1314] text-white font-bold rounded-xl text-[13px] shadow-[0_2px_4px_rgb(238,19,20,0.2)] flex items-center justify-center gap-2 active:bg-[#c80f11] transition-colors"
                                >
                                    <i className="fa-solid fa-bolt"></i>
                                    Mua ngay
                                </button>
                            </div>

                            {/* Desktop Chevron */}
                            <div className="hidden md:flex items-center justify-center text-[#919EAB] group-hover:text-[#ee1314] transition-colors shrink-0 pl-2">
                                <i className="fa-solid fa-chevron-right text-[12px]"></i>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <Pagination
                    page={page}
                    totalPages={10}
                    onPageChange={setPage}
                    totalRecords={100}
                    limit={10}
                />
            </div>
        </div>
    );
};
