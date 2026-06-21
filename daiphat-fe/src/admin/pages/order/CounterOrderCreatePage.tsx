import React, { useState } from 'react';
import { useTicketList } from '../ticket/hooks/useTicket';
import { LotteryTicketStatus } from '../../../constants/lottery.constants';

export const CounterOrderCreatePage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTickets, setSelectedTickets] = useState<any[]>([]);

    // Fetch all tickets in stock
    const { data: ticketsRes, isLoading: isLoadingTickets } = useTicketList({
        status: LotteryTicketStatus.IN_STOCK,
        limit: 100
    });

    const allTickets = (ticketsRes as any)?.data?.recordList || [];

    // Filter tickets by search query
    const filteredTickets = allTickets.filter((ticket: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return ticket.numbers?.toLowerCase().includes(q) || ticket.serialNumber?.toLowerCase().includes(q);
    });

    const toggleTicket = (ticket: any) => {
        const existing = selectedTickets.find(t => t.id === ticket.id);
        if (existing) {
            setSelectedTickets(selectedTickets.filter(t => t.id !== ticket.id));
        } else {
            setSelectedTickets([...selectedTickets, { ...ticket, selectedQuantity: 1 }]);
        }
    };

    const removeTicket = (id: string) => {
        setSelectedTickets(selectedTickets.filter(t => t.id !== id));
    };

    const updateQuantity = (id: string, qty: number) => {
        if (qty < 1) return;
        setSelectedTickets(selectedTickets.map(t => t.id === id ? { ...t, selectedQuantity: qty } : t));
    };

    const totalQty = selectedTickets.reduce((acc, t) => acc + (t.selectedQuantity || 1), 0);
    const totalPrice = selectedTickets.reduce((acc, t) => acc + (t.price || 10000) * (t.selectedQuantity || 1), 0);

    return (
        <div className="flex flex-col h-full pb-20">
            {/* header title */}
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tạo đơn tại quầy</h1>
                    <p className="text-sm text-gray-500 mt-1">Tạo đơn hàng mới cho khách mua trực tiếp tại quầy</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="bg-white px-2 py-2 rounded-xl border border-gray-100 flex items-center w-full mb-2">
                {/* Step 1 */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-900">Thông tin & Chọn vé</span>
                        <span className="text-[11px] text-gray-500">Nhập thông tin và chọn vé</span>
                    </div>
                </div>
                <div className="flex-1 px-3 sm:px-4">
                    <div className="w-full h-[2px] bg-emerald-500"></div>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">2</div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-800">Xác nhận đơn</span>
                        <span className="text-[11px] text-gray-500">Kiểm tra thông tin đơn hàng</span>
                    </div>
                </div>
                <div className="flex-1 px-3 sm:px-4">
                    <div className="w-full h-[2px] bg-gray-200"></div>
                </div>
                {/* Step 3 */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">3</div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-800">Hoàn thành</span>
                        <span className="text-[11px] text-gray-500">Thanh toán và in vé</span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row gap-2 items-start">
                {/* Left Column */}
                <div className="flex-1 flex flex-col gap-2 w-full">
                    {/* Thông tin khách hàng */}
                    <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fa-regular fa-user text-[18px] text-emerald-600"></i>
                            <h3 className="font-bold text-gray-900 text-[15px]">Thông tin khách hàng</h3>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-medium text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                                    <input type="text" placeholder="Nhập họ tên khách hàng" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-medium text-gray-700 mb-1">Số điện thoại</label>
                                    <input type="text" placeholder="Nhập số điện thoại (không bắt buộc)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" placeholder="Nhập email (không bắt buộc)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-gray-700 mb-1">Ghi chú</label>
                                <textarea placeholder="Ghi chú thêm (nếu có)" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none" />
                            </div>
                        </div>
                    </div>

                    {/* Chọn vé */}
                    <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-ticket-simple text-[18px] text-emerald-600"></i>
                            <h3 className="font-bold text-gray-900 text-[15px]">Chọn vé</h3>
                        </div>

                        <div className="mb-3 relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]"></i>
                            <input
                                type="text"
                                placeholder="Tìm số vé (VD: 12345, 66886...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto pr-0.5">
                            {isLoadingTickets ? (
                                <div className="col-span-full py-10 flex justify-center text-gray-500 text-[13px]">Đang tải...</div>
                            ) : filteredTickets.length > 0 ? (
                                filteredTickets.map((ticket: any) => {
                                    const isSelected = selectedTickets.some(t => t.id === ticket.id);
                                    return (
                                        <div
                                            key={ticket.id}
                                            onClick={() => toggleTicket(ticket)}
                                            className={`border rounded-xl p-2 flex flex-col items-center cursor-pointer transition-all relative overflow-hidden
                                                ${isSelected
                                                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                                    : 'border-gray-200 bg-white hover:border-emerald-400 hover:shadow-sm'
                                                }`}
                                        >
                                            {/* Selected checkmark badge */}
                                            {isSelected ? (
                                                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center z-10 shadow">
                                                    <i className="fa-solid fa-check text-[9px]"></i>
                                                </div>
                                            ) : (
                                                <div className="absolute top-1.5 right-1.5 w-5 h-5 border-2 border-gray-200 rounded-full z-10 bg-white"></div>
                                            )}
                                            {/* Image */}
                                            <div className="w-full h-[52px] mb-1.5 flex justify-center items-center">
                                                <img
                                                    src={ticket.ticketImg || "https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png"}
                                                    alt="Vé số"
                                                    className="w-full h-full object-contain mix-blend-multiply"
                                                />
                                            </div>
                                            <div className="font-bold text-[14px] text-gray-900 tracking-tight">{ticket.numbers}</div>
                                            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{(ticket.price || 10000).toLocaleString('vi-VN')}đ</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full py-10 flex flex-col items-center justify-center text-gray-500 gap-2">
                                    <i className="fa-solid fa-box-open text-2xl opacity-50"></i>
                                    <span className="text-[13px]">Không tìm thấy vé</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-2">
                    {/* Thông tin đơn hàng */}
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <i className="fa-solid fa-receipt text-[16px] text-emerald-600"></i>
                            <h3 className="font-bold text-gray-900 text-[15px]">Thông tin đơn hàng</h3>
                        </div>

                        {selectedTickets.length > 0 ? (
                            <>
                                <div className="text-[12px] font-semibold text-gray-500 mb-2">Chi tiết vé chọn ({totalQty} vé):</div>
                                <div className="flex flex-col border border-gray-100 rounded-lg overflow-y-auto max-h-[300px] mb-3">
                                    {selectedTickets.map((t, index) => {
                                        const rowTotal = (t.price || 10000) * (t.selectedQuantity || 1);
                                        return (
                                            <div
                                                key={t.id}
                                                className={`flex items-center gap-2 px-2 py-2 hover:bg-gray-50 transition-colors ${index !== selectedTickets.length - 1 ? 'border-b border-gray-100' : ''}`}
                                            >
                                                {/* Numbers */}
                                                <span className="font-bold text-gray-900 text-[13px] w-[70px] shrink-0 tracking-wider">{t.numbers}</span>

                                                {/* Unit price */}
                                                <span className="text-emerald-600 font-semibold text-[12px] w-[56px] text-right shrink-0">{(t.price || 10000).toLocaleString('vi-VN')}đ</span>

                                                {/* Qty stepper */}
                                                <div className="flex items-center border border-gray-200 rounded bg-white h-[22px] shrink-0">
                                                    <button
                                                        onClick={() => updateQuantity(t.id, (t.selectedQuantity || 1) - 1)}
                                                        className="w-5 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors rounded-l cursor-pointer text-[9px]"
                                                    >−</button>
                                                    <input
                                                        type="text"
                                                        value={t.selectedQuantity || 1}
                                                        onChange={(e) => updateQuantity(t.id, parseInt(e.target.value) || 1)}
                                                        className="w-6 text-center text-[11px] font-bold border-x border-gray-200 h-full focus:outline-none bg-transparent text-gray-900"
                                                    />
                                                    <button
                                                        onClick={() => updateQuantity(t.id, (t.selectedQuantity || 1) + 1)}
                                                        className="w-5 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors rounded-r cursor-pointer text-[9px]"
                                                    >+</button>
                                                </div>

                                                {/* Row total */}
                                                <span className="font-bold text-gray-800 text-[12px] flex-1 text-right">{rowTotal.toLocaleString('vi-VN')}đ</span>

                                                {/* Remove */}
                                                <button
                                                    onClick={() => removeTicket(t.id)}
                                                    className="w-5 h-5 text-gray-300 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                                >
                                                    <i className="fa-regular fa-trash-can text-[11px]"></i>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2 mb-3">
                                <i className="fa-solid fa-ticket text-2xl opacity-30"></i>
                                <span className="text-[13px]">Chưa có vé nào được chọn</span>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="flex items-center justify-between text-[13px] text-gray-500 mb-1 px-1">
                            <span>Tạm tính</span>
                            <span className="font-bold text-gray-800">{totalPrice.toLocaleString('vi-VN')}đ</span>
                        </div>

                        <div className="bg-emerald-50 rounded-xl px-3 py-2.5 flex items-center justify-between mt-2">
                            <span className="text-gray-600 text-[13px] font-medium">Tổng tiền</span>
                            <span className="text-emerald-600 font-bold text-[20px]">{totalPrice.toLocaleString('vi-VN')}đ</span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSelectedTickets([]);
                                setSearchQuery('');
                            }}
                            className="w-[90px] py-1.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-[13px] flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                        >
                            <i className="fa-solid fa-rotate-right text-[11px]"></i> Đặt lại
                        </button>
                        <button
                            disabled={selectedTickets.length === 0}
                            className="flex-1 py-1.5 bg-emerald-500 text-white font-medium rounded-lg text-[13px] flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Tiếp tục <i className="fa-solid fa-arrow-right text-[11px]"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
