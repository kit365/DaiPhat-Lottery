import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { ChevronRight, Calendar as CalendarIcon, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast as toast } from '../../utils/toast.util';
import { useStationsToday, useStationsTomorrow } from '../../../admin/pages/provider/hooks/useProvider';
import { useTicketList } from '../../../admin/pages/ticket/hooks/useTicket';
import { LotteryTicketStatus } from '../../../constants/lottery.constants';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

export const BuyTicketPage = () => {
    const navigate = useNavigate();
    const { token, openLoginModal } = useAuthStore();

    // State
    const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedTab, setSelectedTab] = useState<'quick' | 'manual' | 'birthday'>('quick');
    const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
    const [ticketQuantity, setTicketQuantity] = useState(1);

    // API Hooks
    const { data: stationsTodayData, isLoading: isLoadingToday } = useStationsToday();
    const { data: stationsTomorrowData, isLoading: isLoadingTomorrow } = useStationsTomorrow();

    const isLoadingProviders = selectedDate === 'today' ? isLoadingToday : isLoadingTomorrow;

    const dynamicProvinces = useMemo(() => {
        const sourceData = selectedDate === 'today' ? stationsTodayData : stationsTomorrowData;
        if (!sourceData) return [];
        return sourceData.map((p: any) => ({
            id: p.id || p._id,
            name: p.name,
            time: p.drawTime,
            day: p.drawSchedule,
            icon: p.image || p.thumbnailUrl,
            schedule: p.drawSchedule
        }));
    }, [selectedDate, stationsTodayData, stationsTomorrowData]);

    // No default province selection, require user to click

    // Fetch tickets
    const drawDateFilter = selectedDate === 'today' ? dayjs().format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD');
    const { data: ticketsRes, isLoading: isLoadingTickets } = useTicketList(
        {
            stationId: selectedProvince,
            drawDate: drawDateFilter,
            status: LotteryTicketStatus.IN_STOCK,
            limit: 100
        },
        {
            enabled: !!selectedProvince
        }
    );
    const availableTickets = ticketsRes?.data?.recordList || [];

    const toggleNumber = (num: string) => {
        setTicketQuantity(1); // Reset quantity when changing number
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else {
            setSelectedNumbers([num]);
        }
    };

    const activeProvinceObj = dynamicProvinces.find((p: any) => p.id === selectedProvince);
    const totalQuantity = selectedNumbers.length * ticketQuantity;
    const pricePerTicket = 10000;
    const totalAmount = totalQuantity * pricePerTicket;

    const addToCart = () => {
        if (!activeProvinceObj || selectedNumbers.length === 0) {
            toast.warning('Vui lòng chọn ít nhất 1 vé số!');
            return false;
        }

        let hasError = false;
        selectedNumbers.forEach(num => {
            const ticketData = availableTickets.find((t: any) => t.numbers === num);
            if (!ticketData || (!ticketData.id && !ticketData._id)) {
                hasError = true;
                toast.error(`Lỗi: Không tìm thấy ID cho vé số ${num}`);
                return;
            }

            useCartStore.getState().addItem({
                id: String(ticketData.id || ticketData._id),
                province: activeProvinceObj.name,
                date: selectedDate === 'today' ? `Hôm nay, ${dayjs().format('DD/MM/YYYY')}` : `Ngày mai, ${dayjs().add(1, 'day').format('DD/MM/YYYY')}`,
                time: activeProvinceObj.time,
                kyHieu: ticketData.batchCode || "2K2",
                numbers: num,
                price: pricePerTicket,
                quantity: ticketQuantity,
                color: "#f59e0b"
            });
        });
        
        if (hasError) return false;
        toast.success(`Đã thêm ${totalQuantity} vé vào giỏ hàng`);
        return true;
    };

    const handleCheckout = () => {
        if (!activeProvinceObj || selectedNumbers.length === 0) {
            toast.warning('Vui lòng chọn ít nhất 1 vé số!');
            return;
        }
        useCartStore.getState().clearCart();
        if (addToCart()) {
            navigate('/checkout');
        }
    };

    return (
        <div
            className="min-h-screen font-client-main flex flex-col bg-fixed bg-cover bg-center"
            style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
        >
            <Header />

            {/* Top Section for Breadcrumb & Title (Transparent to show background) */}
            <div className="w-full mt-[70px] lg:mt-[80px] py-4 lg:py-6">
                <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[13px] text-[#637381] mb-2">
                            <Link to="/" className="hover:text-[#ee1314] transition-colors">Trang chủ</Link>
                            <ChevronRight size={14} />
                            <span className="text-[#212B36] font-medium">Mua vé số</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-[#ee1314] bg-[#FFF4F4] w-10 h-10 rounded-lg flex items-center justify-center border border-[#FFEBEE] shadow-sm">
                                <i className="fa-solid fa-ticket text-[20px]"></i>
                            </div>
                            <div>
                                <h1 className="text-[20px] lg:text-[22px] font-bold text-[#212B36] leading-tight">Mua vé số</h1>
                                <p className="text-[#637381] text-[13px]">Chọn đài, chọn số và thanh toán</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 pb-6 flex flex-col">
                <div className="flex flex-col lg:flex-row gap-5 flex-1 items-stretch">

                    {/* Left Content - Master Container */}
                    <div className="flex-1 w-full bg-white rounded-[20px] shadow-md border border-[#E5E8EB] flex flex-col">

                        {/* 1. Chọn ngày mở thưởng */}
                        <div className="p-5 border-b border-[#E5E8EB] shrink-0">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">1</div>
                                <h2 className="text-[16px] font-bold text-[#212B36]">Chọn ngày mở thưởng</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-w-[500px]">
                                {/* Today */}
                                <div
                                    onClick={() => { setSelectedDate('today'); setSelectedProvince(''); setSelectedNumbers([]); }}
                                    className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-colors flex gap-3 items-center
                                        ${selectedDate === 'today' ? 'border-[#ee1314] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`${selectedDate === 'today' ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                                        <CalendarIcon size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-bold text-[14px] ${selectedDate === 'today' ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Hôm nay</div>
                                        <div className="text-[12px] text-[#637381] mt-0.5">{dayjs().format('DD/MM/YYYY')}</div>
                                    </div>
                                    {selectedDate === 'today' && (
                                        <div className="text-[#ee1314]">
                                            <CheckCircle2 size={24} className="fill-[#ee1314] text-white shadow-sm rounded-full" />
                                        </div>
                                    )}
                                </div>
                                {/* Tomorrow */}
                                <div
                                    onClick={() => { setSelectedDate('tomorrow'); setSelectedProvince(''); setSelectedNumbers([]); }}
                                    className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-colors flex gap-3 items-center
                                        ${selectedDate === 'tomorrow' ? 'border-[#ee1314] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`${selectedDate === 'tomorrow' ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                                        <CalendarIcon size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-bold text-[14px] ${selectedDate === 'tomorrow' ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Ngày mai</div>
                                        <div className="text-[12px] text-[#637381] mt-0.5">{dayjs().add(1, 'day').format('DD/MM/YYYY')}</div>
                                    </div>
                                    {selectedDate === 'tomorrow' && (
                                        <div className="text-[#ee1314]">
                                            <CheckCircle2 size={24} className="fill-[#ee1314] text-white shadow-sm rounded-full" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Chọn đài mở thưởng */}
                        <div className="p-5 border-b border-[#E5E8EB] shrink-0">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">2</div>
                                <h2 className="text-[16px] font-bold text-[#212B36]">Chọn đài mở thưởng</h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-[750px]">
                                {isLoadingProviders ? (
                                    <div className="col-span-full py-4 text-center text-[#637381] text-sm">Đang tải danh sách đài...</div>
                                ) : dynamicProvinces.map((prov: any) => (
                                    <div
                                        key={prov.id}
                                        onClick={() => { setSelectedProvince(prov.id); setSelectedNumbers([]); }}
                                        className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-colors flex flex-col items-center text-center
                                            ${selectedProvince === prov.id ? 'border-[#ee1314] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                        `}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E5E8EB] mb-2 overflow-hidden p-1.5">
                                            <img src={prov.icon} alt={prov.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="font-bold text-[13px] text-[#212B36]">{prov.name}</div>
                                        <div className="text-[11px] mt-0.5 font-medium text-[#ee1314]">{prov.time}</div>

                                        {selectedProvince === prov.id && (
                                            <div className="absolute top-1.5 right-1.5 text-[#ee1314]">
                                                <CheckCircle2 size={24} className="fill-[#ee1314] text-white shadow-sm rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Chọn số */}
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 mb-4 shrink-0">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">3</div>
                                <h2 className="text-[16px] font-bold text-[#212B36] flex items-center gap-2">
                                    Chọn số
                                    {activeProvinceObj && (
                                        <span className="text-[#ee1314] text-[14px]">
                                            • {activeProvinceObj.name} • {activeProvinceObj.time}
                                        </span>
                                    )}
                                </h2>
                            </div>

                            {/* Pill Tabs and Search */}
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5 shrink-0">
                                {/* Search Box */}
                                <div className="flex-1 w-full lg:max-w-[350px] flex items-center bg-white rounded-full border border-[#E5E8EB] p-1 shadow-sm">
                                    <div className="pl-3 text-[#637381]">
                                        <i className="fa-solid fa-magnifying-glass text-[14px]"></i>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Tìm số (VD: 12345, 68686...)"
                                        className="flex-1 bg-transparent border-none outline-none px-3 text-[13px] text-[#212B36] placeholder:text-[#919EAB]"
                                    />
                                    <button className="px-4 py-1.5 bg-[#FFF4F4] text-[#ee1314] font-bold text-[13px] rounded-full hover:bg-[#FFEBEB] transition-colors">
                                        Tìm ngay
                                    </button>
                                </div>

                                {/* Pill Tabs */}
                                <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
                                    <button
                                        onClick={() => setSelectedTab('quick')}
                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-colors flex items-center gap-1.5 ${selectedTab === 'quick' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381] hover:bg-[#E5E8EB]'}`}
                                    >
                                        <i className="fa-regular fa-star"></i> Chọn nhanh
                                    </button>
                                    <button
                                        onClick={() => setSelectedTab('manual')}
                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${selectedTab === 'manual' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381] hover:bg-[#E5E8EB]'}`}
                                    >
                                        Chọn số
                                    </button>
                                    <button
                                        onClick={() => setSelectedTab('birthday')}
                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${selectedTab === 'birthday' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381] hover:bg-[#E5E8EB]'}`}
                                    >
                                        Số theo ngày sinh
                                    </button>
                                </div>
                            </div>

                            {/* Numbers Grid (10 columns) */}
                            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2.5 flex-1 content-start shrink-0">
                                {!selectedProvince ? (
                                    <div className="col-span-full py-10 flex justify-center text-[#637381] font-medium">
                                        Vui lòng chọn đài mở thưởng để xem vé
                                    </div>
                                ) : isLoadingTickets ? (
                                    <div className="col-span-full py-10 flex justify-center text-[#637381] font-medium">
                                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải vé số...
                                    </div>
                                ) : availableTickets.length > 0 ? (
                                    availableTickets.map((ticket: any, i: number) => {
                                        const num = ticket.numbers;
                                        const isSelected = selectedNumbers.includes(num);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => toggleNumber(num)}
                                                className={`py-2 px-1 rounded-lg border text-[14px] font-bold transition-colors tracking-wider cursor-pointer
                                                    ${isSelected ? 'bg-[#ee1314] border-[#ee1314] text-white shadow-md' : 'bg-gray-50 border-[#E5E8EB] text-[#212B36] hover:border-[#ee1314] hover:text-[#ee1314] hover:bg-[#FFF4F4]'}
                                                `}
                                            >
                                                {num}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-10 flex flex-col items-center justify-center text-[#637381] gap-2">
                                        <i className="fa-solid fa-box-open text-3xl opacity-50"></i>
                                        <span>Không có vé số nào cho đài này trong {selectedDate === 'today' ? 'hôm nay' : 'ngày mai'}.</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-start mt-5 shrink-0">
                                <button
                                    onClick={() => {
                                        setSelectedNumbers([]);
                                        setTicketQuantity(1);
                                    }}
                                    className="flex items-center gap-1.5 text-[#637381] hover:text-[#212B36] text-[13px] font-medium transition-colors"
                                >
                                    <RefreshCw size={14} /> Bỏ chọn tất cả
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[360px] shrink-0 flex flex-col">
                        <div className="bg-white rounded-[20px] shadow-md border border-[#E5E8EB] flex flex-col flex-1 overflow-hidden sticky top-24">
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center gap-3 mb-5 shrink-0">
                                    <div className="bg-[#ee1314] text-white w-6 h-6 rounded flex items-center justify-center text-[12px]">
                                        <i className="fa-solid fa-ticket"></i>
                                    </div>
                                    <h3 className="text-[16px] font-bold text-[#212B36]">Chi tiết vé</h3>
                                </div>

                                {/* Province Info */}
                                {activeProvinceObj && (
                                    <div className="bg-white border border-[#E5E8EB] rounded-xl p-4 flex items-center gap-3 mb-6 shrink-0 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none"></div>
                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm p-1.5 overflow-hidden shrink-0 border border-[#E5E8EB] z-10">
                                            <img src={activeProvinceObj.icon} alt={activeProvinceObj.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="z-10 relative">
                                            <div className="font-bold text-[14px] text-[#212B36]">Vé số {activeProvinceObj.name}</div>
                                            <div className="text-[12px] text-[#637381] mt-1">Mở thưởng: {activeProvinceObj.time}</div>
                                            <div className="text-[12px] text-[#637381] mt-0.5">Ngày: {selectedDate === 'today' ? dayjs().format('DD/MM/YYYY') : dayjs().add(1, 'day').format('DD/MM/YYYY')}</div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="border-t border-dashed border-[#E5E8EB] -mx-5 mb-5"></div>

                                {/* Selected Numbers & Quantity Selector */}
                                <div className="mb-5 shrink-0">
                                    <div className="text-[13px] text-[#637381] font-medium mb-2">
                                        Số đã chọn ({selectedNumbers.length} số)
                                    </div>
                                    
                                    {selectedNumbers.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 mb-6 max-h-[100px] overflow-y-auto">
                                            {selectedNumbers.map(num => (
                                                <span key={num} className="px-3 py-1 bg-[#FFF4F4] text-[#ee1314] font-bold text-lg rounded-md border border-[#FFEBEE]">
                                                    {num}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[#919EAB] text-sm italic mb-6">
                                            Vui lòng chọn số ở bên trái
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-5">
                                        <span className="text-[13px] text-[#637381] font-medium">Bội số (Mỗi số)</span>
                                        <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E5E8EB] p-1 h-9 w-[100px]">
                                            <button 
                                                onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                                                disabled={ticketQuantity <= 1}
                                                className="flex-1 h-full flex items-center justify-center text-[#212B36] hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                            >
                                                <i className="fa-solid fa-minus text-[12px]"></i>
                                            </button>
                                            <span className="w-8 text-center text-[14px] font-bold text-[#212B36] border-x border-[#E5E8EB] h-full flex items-center justify-center">{ticketQuantity}</span>
                                            <button 
                                                onClick={() => setTicketQuantity(ticketQuantity + 1)}
                                                className="flex-1 h-full flex items-center justify-center text-[#212B36] hover:bg-gray-50 transition-colors"
                                            >
                                                <i className="fa-solid fa-plus text-[12px]"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-[13px]">
                                        <span className="text-[#637381]">Giá 1 vé</span>
                                        <span className="text-[#ee1314] font-bold">{pricePerTicket.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                </div>
                            </div>

                            {/* Total & Action Bottom */}
                            <div className="bg-[#FFF4F4] px-5 py-5 flex flex-col gap-4 mt-auto border-t border-[#FFEBEE]">
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] font-bold text-[#212B36]">Tổng thanh toán</span>
                                    <span className="text-[24px] font-black text-[#ee1314] leading-none">{totalAmount.toLocaleString('vi-VN')} đ</span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleCheckout}
                                        disabled={totalQuantity === 0}
                                        className="w-full py-3 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] hover:bg-[#d00f10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#ee1314]/20"
                                    >
                                        <i className="fa-solid fa-bolt"></i> Mua ngay
                                    </button>
                                    <button
                                        onClick={addToCart}
                                        disabled={totalQuantity === 0}
                                        className="w-full py-3 bg-white text-[#ee1314] font-bold rounded-xl border border-[#ee1314] text-[14px] hover:bg-[#FFF4F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-cart-plus"></i> Thêm vào giỏ hàng
                                    </button>
                                </div>

                                <div className="flex justify-between items-center mt-3 pt-4 border-t border-[#FFEBEE]/50 px-1">
                                    <div className="flex flex-col items-center gap-1.5 text-center">
                                        <ShieldCheck className="text-[#00A76F]" size={20} strokeWidth={1.5} />
                                        <span className="text-[10px] text-[#637381] font-medium">Bảo mật 100%</span>
                                    </div>
                                    <div className="w-[1px] h-6 bg-[#E5E8EB]"></div>
                                    <div className="flex flex-col items-center gap-1.5 text-center">
                                        <i className="fa-solid fa-bolt text-[#F59E0B] text-[18px]"></i>
                                        <span className="text-[10px] text-[#637381] font-medium">Thanh toán nhanh</span>
                                    </div>
                                    <div className="w-[1px] h-6 bg-[#E5E8EB]"></div>
                                    <div className="flex flex-col items-center gap-1.5 text-center">
                                        <i className="fa-solid fa-headset text-[#8B5CF6] text-[18px]"></i>
                                        <span className="text-[10px] text-[#637381] font-medium">Hỗ trợ 24/7</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

