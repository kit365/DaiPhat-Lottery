import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { ChevronRight, Calendar as CalendarIcon, CheckCircle2, ShieldCheck, RefreshCw, ChevronDown, ChevronUp, Filter, LayoutGrid, Heart, SlidersHorizontal, Trash2, Search } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast as toast } from '../../utils/toast.util';
import { useStationsToday, useStationsTomorrow } from '../../../admin/pages/provider/hooks/useProvider';
import { useTicketList } from '../../../admin/pages/ticket/hooks/useTicket';
import { LotteryTicketStatus } from '../../../constants/lottery.constants';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

// Preload critical images to prevent flickering on first load
if (typeof window !== 'undefined') {
    const imagesToPreload = [
        "https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png",
        "https://i.ibb.co/LXLSg1qx/07bf0bdd-3932-4bbd-8df4-c08e72c52800.png",
        "https://i.ibb.co/tpJtrscQ/d0ea187b-cfe0-4a28-9366-c10db2e6a96c.png",
        "https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png"
    ];
    imagesToPreload.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

const BannerSection = React.memo(() => (
    <div className="hidden xl:flex w-[260px] shrink-0 flex-col gap-4">
        {/* Banner 1 */}
        <a href="#" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group">
            <img src="https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png" alt="Vé số Đại Phát" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 flex flex-col items-center pt-8 px-4 text-center">
                <h3 className="text-[#FFDF70] font-black text-[36px] leading-[1.1] mb-2 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>VÉ SỐ<br />ĐẠI PHÁT</h3>
                <p className="text-white text-[14px] font-medium mb-3 drop-shadow-md">Nền tảng mua vé số<br />uy tín hàng đầu</p>
                <button className="bg-gradient-to-r from-[#FFE58F] to-[#FFD666] text-[#D82A2A] font-bold px-5 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
                    Mua vé ngay
                </button>
            </div>
        </a>

        {/* Banner 2 */}
        <a href="#" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group">
            <img src="https://i.ibb.co/LXLSg1qx/07bf0bdd-3932-4bbd-8df4-c08e72c52800.png" alt="Tìm số may mắn" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 flex flex-col justify-center items-start p-4 pb-10 w-[65%]">
                <h3 className="text-[#FFDF70] font-bold text-[14px] mb-2 drop-shadow-md">TÌM SỐ MAY MẮN</h3>
                <p className="text-white text-[14px] font-medium mb-3 drop-shadow-md leading-snug">Chọn dãy số yêu thích<br />nhận ngay lộc lớn!</p>
                <button className="bg-gradient-to-r from-[#FFE58F] to-[#FFD666] text-[#D82A2A] font-bold px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
                    Chọn số ngay
                </button>
            </div>
        </a>

        {/* Banner 3 */}
        <a href="#" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group">
            <img src="https://i.ibb.co/tpJtrscQ/d0ea187b-cfe0-4a28-9366-c10db2e6a96c.png" alt="Dịch vụ vé số" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 flex flex-col justify-center items-start p-4 w-[70%]">
                <h3 className="text-white font-bold text-[14px] mb-1.5 drop-shadow-md">DỊCH VỤ VÉ SỐ</h3>
                <div className="text-white font-bold text-[14px] mb-0.5">Nhận ảnh vé thật <span className="text-[14px]">100%</span></div>
                <p className="text-white text-[12px] mb-3 opacity-90">Bảo mật & An toàn tuyệt đối</p>
                <button className="bg-white text-[#ee1314] font-bold px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
                    Tìm hiểu thêm
                </button>
            </div>
        </a>
    </div>
));

export const BuyTicketPage = () => {
    const navigate = useNavigate();
    const { token, openLoginModal } = useAuthStore();

    // State
    const [selectedDates, setSelectedDates] = useState<string[]>(['today']);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [selectedTab, setSelectedTab] = useState<'quick' | 'manual' | 'birthday'>('quick');
    const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
    const [ticketQuantity, setTicketQuantity] = useState(1);
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [isProvinceOpen, setIsProvinceOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterActiveTab, setFilterActiveTab] = useState<'all' | 'favorites' | 'range'>('favorites');
    const [rangeCheckedBoxes, setRangeCheckedBoxes] = useState<string[]>(['00 - 09', '20 - 29', '80 - 89']);
    const selectorsRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorsRef.current && !selectorsRef.current.contains(event.target as Node)) {
                setIsDateOpen(false);
                setIsProvinceOpen(false);
            }
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // API Hooks
    const { data: stationsTodayData, isLoading: isLoadingToday } = useStationsToday();
    const { data: stationsTomorrowData, isLoading: isLoadingTomorrow } = useStationsTomorrow();

    const isLoadingProviders = isLoadingToday || isLoadingTomorrow;

    const dynamicProvinces = useMemo(() => {
        let combined: any[] = [];
        if (selectedDates.includes('today') && stationsTodayData) combined = [...combined, ...stationsTodayData];
        if (selectedDates.includes('tomorrow') && stationsTomorrowData) combined = [...combined, ...stationsTomorrowData];
        
        const unique = Array.from(new Map(combined.map(item => [item.id || item._id, item])).values());
        return unique.map((p: any) => ({
            id: p.id || p._id,
            name: p.name,
            time: p.drawTime,
            day: p.drawSchedule,
            icon: p.image || p.thumbnailUrl,
            schedule: p.drawSchedule
        }));
    }, [selectedDates, stationsTodayData, stationsTomorrowData]);

    // Tự động chọn đài đầu tiên nếu chưa chọn
    useEffect(() => {
        if (dynamicProvinces.length > 0 && selectedProvinces.length === 0) {
            setSelectedProvinces([dynamicProvinces[0].id]);
        }
    }, [dynamicProvinces, selectedProvinces]);
    
    // Fetch tickets
    const drawDateFilter = selectedDates.map(d => d === 'today' ? dayjs().format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD')).join(',');
    const { data: ticketsRes, isLoading: isLoadingTickets } = useTicketList(
        {
            stationIds: selectedProvinces,
            drawDate: drawDateFilter,
            status: LotteryTicketStatus.IN_STOCK,
            limit: 100
        },
        {
            enabled: selectedProvinces.length > 0
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

    const maxAvailable = useMemo(() => {
        if (selectedNumbers.length === 0) return 1;
        const num = selectedNumbers[0];
        const ticketData = availableTickets.find((t: any) => t.numbers === num);
        return ticketData?.quantity || 1;
    }, [selectedNumbers, availableTickets]);

    const activeProvinces = dynamicProvinces.filter((p: any) => selectedProvinces.includes(p.id));

    const selectedTicketProvinces = useMemo(() => {
        if (selectedNumbers.length === 0) return activeProvinces;
        
        const provs = new Map();
        selectedNumbers.forEach(num => {
            const ticketData = availableTickets.find((t: any) => t.numbers === num);
            if (ticketData) {
                const prov = dynamicProvinces.find((p: any) => p.id === ticketData.providerId || p.id === ticketData.stationId);
                if (prov && !provs.has(prov.id)) {
                    provs.set(prov.id, prov);
                }
            }
        });
        
        const arr = Array.from(provs.values());
        return arr.length > 0 ? arr : activeProvinces;
    }, [selectedNumbers, availableTickets, dynamicProvinces, activeProvinces]);
    const totalQuantity = selectedNumbers.length * ticketQuantity;
    const pricePerTicket = 10000;
    const totalAmount = totalQuantity * pricePerTicket;

    const addToCart = () => {
        if (selectedProvinces.length === 0 || selectedNumbers.length === 0) {
            toast.warning('Vui lòng chọn đài và ít nhất 1 vé số!');
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

            const maxAvailableQty = ticketData?.quantity || 1;
            const currentCartItem = useCartStore.getState().items.find(i =>
                i.id === String(ticketData.id || ticketData._id)
            );
            const currentCartQty = currentCartItem ? currentCartItem.quantity : 0;

            if (currentCartQty + ticketQuantity > maxAvailableQty) {
                hasError = true;
                toast.error(`Vé số ${num} chỉ còn ${maxAvailableQty} vé (bạn đã có ${currentCartQty} vé trong giỏ)`);
                return;
            }

            const activeProv = dynamicProvinces.find((p: any) => p.id === ticketData.providerId || p.id === ticketData.stationId) || activeProvinces[0];
            const ticketDateStr = ticketData.drawDate ? dayjs(ticketData.drawDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
            useCartStore.getState().addItem({
                id: String(ticketData.id || ticketData._id),
                province: activeProv?.name || 'Nhà đài',
                provinceIcon: activeProv?.icon,
                date: ticketDateStr,
                time: activeProv?.time || '--:--',
                kyHieu: ticketData.batchCode || "2K2",
                numbers: num,
                price: pricePerTicket,
                quantity: ticketQuantity,
                color: "#f59e0b",
                ticketImg: ticketData.ticketImg,
                maxStock: maxAvailableQty
            });
        });

        if (hasError) return false;
        toast.success(`Đã thêm ${totalQuantity} vé vào giỏ hàng`);
        return true;
    };

    const handleCheckout = () => {
        if (selectedProvinces.length === 0 || selectedNumbers.length === 0) {
            toast.warning('Vui lòng chọn đài và ít nhất 1 vé số!');
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

            <main className="flex-1 w-full mt-[70px] lg:mt-[80px] max-w-[1440px] mx-auto px-4 lg:px-8 py-6 flex flex-col">
                <div className="flex flex-col xl:flex-row gap-5 flex-1 items-stretch">

                    {/* Left Banners Sidebar - New addition based on design */}
                    <BannerSection />

                    {/* Main Content - Center Column */}
                    <div className="flex-1 w-full flex flex-col min-w-0">

                        {/* Top Selectors Card (Ngày & Đài) */}
                        <div ref={selectorsRef} className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] grid grid-cols-1 md:grid-cols-2 mb-5 shrink-0">

                            {/* Ngày Quay */}
                            <div className="relative p-4 lg:p-5 cursor-pointer hover:bg-gray-50 transition-colors rounded-l-[20px] border-r border-[#E5E8EB]" onClick={() => { setIsDateOpen(!isDateOpen); setIsProvinceOpen(false); }}>
                                <div className="flex gap-4 items-center">
                                    <div className="text-[#ee1314] shrink-0">
                                        <CalendarIcon size={28} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[12px] text-[#637381] font-bold uppercase tracking-wider mb-1">Ngày quay</div>
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-[14px] text-[#212B36]">
                                                {selectedDates.length === 2 ? 'Hôm nay, Ngày mai' : (selectedDates[0] === 'today' ? 'Hôm nay' : (selectedDates[0] === 'tomorrow' ? 'Ngày mai' : 'Vui lòng chọn'))}
                                            </div>
                                            {isDateOpen ? <ChevronUp size={20} className="text-[#212B36]" /> : <ChevronDown size={20} className="text-[#212B36]" />}
                                        </div>
                                        <div className="text-[13px] text-[#637381] mt-0.5">
                                            {selectedDates.length === 2 ? `${dayjs().format('DD/MM')}, ${dayjs().add(1, 'day').format('DD/MM')}` : (selectedDates[0] === 'today' ? dayjs().locale('vi').format('DD/MM/YYYY (dddd)').replace(/t/g, 'T').replace('Thứ', 'Thứ').replace('chủ', 'Chủ') : (selectedDates[0] === 'tomorrow' ? dayjs().add(1, 'day').locale('vi').format('DD/MM/YYYY (dddd)').replace(/t/g, 'T').replace('Thứ', 'Thứ').replace('chủ', 'Chủ') : '---'))}
                                        </div>
                                    </div>
                                </div>

                                {/* Dropdown menu */}
                                {isDateOpen && (
                                    <div className="absolute top-[105%] left-0 right-0 bg-white border border-[#E5E8EB] shadow-lg rounded-xl z-20 overflow-hidden p-2">
                                        <div
                                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${selectedDates.includes('today') ? 'bg-[#FFF4F4]' : 'hover:bg-gray-50'}`}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (selectedDates.includes('today')) {
                                                    setSelectedDates(selectedDates.filter(d => d !== 'today'));
                                                } else {
                                                    setSelectedDates([...selectedDates, 'today']);
                                                }
                                            }}
                                        >
                                            <div>
                                                <div className={`font-bold ${selectedDates.includes('today') ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Hôm nay</div>
                                                <div className="text-[14px] text-[#637381]">{dayjs().locale('vi').format('DD/MM/YYYY (dddd)').replace(/t/g, 'T').replace('Thứ', 'Thứ').replace('chủ', 'Chủ')}</div>
                                            </div>
                                            <div className="mt-0.5">
                                                {selectedDates.includes('today') ? (
                                                    <div className="w-4 h-4 rounded-[4px] bg-[#ee1314] text-white flex items-center justify-center">
                                                        <i className="fa-solid fa-check text-[12px]"></i>
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white"></div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Date separator */}
                                        <div className="h-[1px] bg-[#E5E8EB] my-1 mx-3"></div>
                                        <div
                                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${selectedDates.includes('tomorrow') ? 'bg-[#FFF4F4]' : 'hover:bg-gray-50'}`}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (selectedDates.includes('tomorrow')) {
                                                    setSelectedDates(selectedDates.filter(d => d !== 'tomorrow'));
                                                } else {
                                                    setSelectedDates([...selectedDates, 'tomorrow']);
                                                }
                                            }}
                                        >
                                            <div>
                                                <div className={`font-bold ${selectedDates.includes('tomorrow') ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Ngày mai</div>
                                                <div className="text-[14px] text-[#637381]">{dayjs().add(1, 'day').locale('vi').format('DD/MM/YYYY (dddd)').replace(/t/g, 'T').replace('Thứ', 'Thứ').replace('chủ', 'Chủ')}</div>
                                            </div>
                                            <div className="mt-0.5">
                                                {selectedDates.includes('tomorrow') ? (
                                                    <div className="w-4 h-4 rounded-[4px] bg-[#ee1314] text-white flex items-center justify-center">
                                                        <i className="fa-solid fa-check text-[12px]"></i>
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white"></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chọn Đài */}
                            <div className="relative p-4 lg:p-5 cursor-pointer hover:bg-gray-50 transition-colors rounded-r-[20px]" onClick={() => { setIsProvinceOpen(!isProvinceOpen); setIsDateOpen(false); }}>
                                <div className="flex gap-4 items-center">
                                    <div className="shrink-0">
                                        {selectedProvinces.length > 0 ? (
                                            <div className="w-[40px] h-[40px] rounded-full border border-[#E5E8EB] overflow-hidden flex items-center justify-center p-[2px] bg-white">
                                                <img src={dynamicProvinces.find(p => p.id === selectedProvinces[0])?.icon} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-[40px] h-[40px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <i className="fa-solid fa-building text-[14px]"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[12px] text-[#637381] font-bold uppercase tracking-wider mb-1">Chọn đài</div>
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-[14px] text-[#212B36] truncate max-w-[150px] sm:max-w-[200px]">
                                                {selectedProvinces.length > 1 ? `Đã chọn ${selectedProvinces.length} đài` : (selectedProvinces.length === 1 ? dynamicProvinces.find(p => p.id === selectedProvinces[0])?.name : 'Vui lòng chọn đài')}
                                            </div>
                                            <div className={`${isProvinceOpen ? 'border border-[#ee1314] rounded text-[#ee1314] w-6 h-6 flex items-center justify-center' : 'text-[#212B36]'}`}>
                                                {isProvinceOpen ? <ChevronDown size={16} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                        <div className="text-[13px] text-[#212B36] font-medium mt-0.5">{selectedProvinces.length === 1 ? dynamicProvinces.find(p => p.id === selectedProvinces[0])?.time : (selectedProvinces.length > 1 ? 'Các đài miền Nam' : '---')}</div>
                                    </div>
                                </div>

                                {/* Dropdown menu */}
                                {isProvinceOpen && (
                                    <div className="absolute top-[105%] left-0 right-0 bg-white border border-[#E5E8EB] shadow-lg rounded-xl z-20 max-h-[350px] overflow-y-auto p-2">
                                        {isLoadingProviders ? (
                                            <div className="p-4 text-center text-[#637381]">Đang tải...</div>
                                        ) : dynamicProvinces.map((prov: any, index: number) => {
                                            const isProvSelected = selectedProvinces.includes(prov.id);
                                            return (
                                                <div key={prov.id}>
                                                    <div
                                                        className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${isProvSelected ? 'bg-[#FFF4F4]' : 'hover:bg-gray-50'}`}
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            if (selectedProvinces.includes(prov.id)) {
                                                                setSelectedProvinces(selectedProvinces.filter(p => p !== prov.id));
                                                            } else {
                                                                setSelectedProvinces([...selectedProvinces, prov.id]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-[36px] h-[36px] rounded-full border border-[#E5E8EB] overflow-hidden flex items-center justify-center p-[2px] bg-white">
                                                                <img src={prov.icon} alt="" className="w-full h-full object-contain" />
                                                            </div>
                                                            <div>
                                                                <div className={`font-bold ${isProvSelected ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>{prov.name}</div>
                                                                <div className={`text-[14px] ${isProvSelected ? 'text-[#ee1314]' : 'text-[#637381]'}`}>{prov.time}</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            {isProvSelected ? (
                                                                <div className="w-4 h-4 rounded-[4px] bg-[#ee1314] text-white flex items-center justify-center">
                                                                    <i className="fa-solid fa-check text-[12px]"></i>
                                                                </div>
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {index < dynamicProvinces.length - 1 && <div className="h-[1px] bg-[#E5E8EB] my-1 mx-3"></div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Bottom Main Content Card (Tickets List) */}
                        <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] flex flex-col flex-1">
                            {/* Search and Filter */}
                            <div className="p-4 lg:p-5 border-b border-[#E5E8EB] flex flex-col md:flex-row gap-4 items-center shrink-0">
                                <div className="flex-1 w-full flex items-center bg-white rounded-xl border border-[#E5E8EB] px-4 py-2.5">
                                    <i className="fa-solid fa-magnifying-glass text-[#637381] mr-3"></i>
                                    <input
                                        type="text"
                                        placeholder="Tìm số (VD: 12345, 68686...)"
                                        className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#212B36] placeholder:text-[#919EAB]"
                                    />
                                </div>
                                <div className="relative" ref={filterRef}>
                                    <button 
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                        className={`flex items-center gap-2 border rounded-xl px-5 py-2.5 bg-white font-medium hover:bg-gray-50 transition-colors w-full md:w-auto justify-center text-[14px] ${isFilterOpen ? 'border-[#ee1314] text-[#ee1314]' : 'border-[#E5E8EB] text-[#212B36]'}`}
                                    >
                                        <Filter size={18} className={isFilterOpen ? 'text-[#ee1314]' : 'text-[#637381]'} /> 
                                        Lọc dãy số 
                                        <ChevronDown size={16} className={`ml-1 ${isFilterOpen ? 'text-[#ee1314]' : 'text-[#637381]'}`} />
                                    </button>

                                    {/* Filter Dropdown */}
                                    {isFilterOpen && (
                                        <div className="absolute right-0 top-[110%] w-[750px] bg-white rounded-xl shadow-lg border border-[#E5E8EB] z-30 flex flex-col overflow-hidden">
                                            <div className="flex flex-1">
                                                {/* Left Sidebar */}
                                                <div className="w-[200px] border-r border-[#E5E8EB] flex flex-col py-3 bg-white gap-1 px-2">
                                                    <div 
                                                        onClick={() => setFilterActiveTab('all')}
                                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${filterActiveTab === 'all' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'hover:bg-gray-50 text-[#637381]'}`}
                                                    >
                                                        <LayoutGrid size={18} className={filterActiveTab === 'all' ? 'text-[#ee1314]' : 'text-[#637381]'} />
                                                        <span className={`text-[14px] ${filterActiveTab === 'all' ? 'font-bold' : 'font-medium'}`}>Tất cả dãy số</span>
                                                    </div>
                                                    <div 
                                                        onClick={() => setFilterActiveTab('favorites')}
                                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors relative ${filterActiveTab === 'favorites' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'hover:bg-gray-50 text-[#637381]'}`}
                                                    >
                                                        {filterActiveTab === 'favorites' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#ee1314] rounded-r-md"></div>}
                                                        <Heart size={18} className={filterActiveTab === 'favorites' ? 'text-[#ee1314]' : 'text-[#637381]'} />
                                                        <span className={`text-[14px] ${filterActiveTab === 'favorites' ? 'font-bold' : 'font-medium'}`}>Dãy số yêu thích</span>
                                                    </div>
                                                    <div 
                                                        onClick={() => setFilterActiveTab('range')}
                                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors relative ${filterActiveTab === 'range' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'hover:bg-gray-50 text-[#637381]'}`}
                                                    >
                                                        {filterActiveTab === 'range' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#ee1314] rounded-r-md"></div>}
                                                        <SlidersHorizontal size={18} className={filterActiveTab === 'range' ? 'text-[#ee1314]' : 'text-[#637381]'} />
                                                        <span className={`text-[14px] ${filterActiveTab === 'range' ? 'font-bold' : 'font-medium'}`}>Lọc theo khoảng số</span>
                                                    </div>
                                                </div>

                                                {/* Right Content */}
                                                <div className="flex-1 p-6 flex flex-col bg-white">
                                                    {filterActiveTab === 'favorites' && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                                                            <div className="mb-4">
                                                                <h4 className="font-bold text-[14px] text-[#212B36] uppercase mb-1">Dãy số yêu thích</h4>
                                                                <p className="text-[14px] text-[#637381]">Chọn nhanh các dãy số bạn lưu để lọc vé.</p>
                                                            </div>
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <div className="flex-1 flex items-center bg-white rounded-lg border border-[#E5E8EB] px-3 py-2 h-10">
                                                                    <Search size={16} className="text-[#919EAB] mr-2" />
                                                                    <input type="text" placeholder="Nhập dãy số yêu thích" className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#212B36] placeholder:text-[#919EAB]" />
                                                                </div>
                                                                <button className="h-10 px-4 rounded-lg border border-[#ee1314] text-[#ee1314] text-[14px] font-medium bg-white hover:bg-[#FFF4F4] flex items-center gap-1 transition-colors whitespace-nowrap">
                                                                    <span className="text-[18px] leading-none mb-[2px]">+</span> Thêm dãy số
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2.5 items-center mb-6">
                                                                {['12', '34', '56', '78', '99', '68', '86', '123', '456', '888', '999'].map((num, idx) => (
                                                                    <div key={idx} className="h-9 px-3 rounded-lg border border-[#E5E8EB] text-[#212B36] text-[14px] font-bold bg-white flex items-center justify-between min-w-[60px] gap-2">
                                                                        <span>{num}</span>
                                                                        <i className="fa-solid fa-xmark text-[#919EAB] text-[14px] cursor-pointer hover:text-[#ee1314]"></i>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="border-t border-[#E5E8EB] mb-4"></div>
                                                            <div>
                                                                <div className="text-[14px] font-bold text-[#212B36] mb-3">Gợi ý dãy số</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '111', '222', '333', '444', '555', '666', '777', '000'].map((num, idx) => (
                                                                        <div key={`s-${idx}`} className="h-8 px-3 rounded-lg border border-[#E5E8EB] text-[#637381] text-[14px] bg-[#fafafa] flex items-center justify-center cursor-pointer hover:bg-[#E5E8EB]">
                                                                            {num}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {filterActiveTab === 'range' && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                                                            <div className="mb-5">
                                                                <h4 className="font-bold text-[14px] text-[#212B36] uppercase mb-1">Lọc theo khoảng số</h4>
                                                                <p className="text-[14px] text-[#637381]">Chọn khoảng số để lọc nhanh các vé phù hợp.</p>
                                                            </div>
                                                            <div className="grid grid-cols-5 gap-3 mb-6">
                                                                {['00 - 09', '10 - 19', '20 - 29', '30 - 39', '40 - 49', '50 - 59', '60 - 69', '70 - 79', '80 - 89', '90 - 99'].map((range, idx) => {
                                                                    const isChecked = rangeCheckedBoxes.includes(range);
                                                                    return (
                                                                        <div 
                                                                            key={idx} 
                                                                            onClick={() => {
                                                                                if (isChecked) setRangeCheckedBoxes(prev => prev.filter(r => r !== range));
                                                                                else setRangeCheckedBoxes(prev => [...prev, range]);
                                                                            }}
                                                                            className={`h-9 rounded-lg border flex items-center px-2 cursor-pointer transition-colors ${isChecked ? 'border-[#ee1314] bg-[#FFF4F4]' : 'border-[#E5E8EB] bg-white hover:border-[#ee1314]'}`}
                                                                        >
                                                                            <div className={`w-4 h-4 rounded-[4px] border mr-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-[#ee1314] border-[#ee1314] text-white' : 'border-[#C4CDD5] bg-white'}`}>
                                                                                {isChecked && <i className="fa-solid fa-check text-[12px]"></i>}
                                                                            </div>
                                                                            <span className="text-[14px] text-[#212B36] font-medium">{range}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="border-t border-[#E5E8EB] mb-5"></div>

                                                            <div className="mb-5">
                                                                <div className="text-[14px] font-bold text-[#212B36] uppercase mb-3">Tùy chọn thêm</div>
                                                                <div className="flex gap-4">
                                                                    {['Số kép', 'Số tiến', 'Số lặp', 'Đầu số', 'Đuôi số'].map((opt, idx) => (
                                                                        <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                                                                            <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white group-hover:border-[#ee1314] transition-colors flex items-center justify-center"></div>
                                                                            <span className="text-[14px] text-[#212B36]">{opt}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="mb-5">
                                                                <div className="text-[14px] font-bold text-[#212B36] uppercase mb-3">Thêm khoảng số tùy chỉnh</div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center bg-white border border-[#E5E8EB] rounded-lg h-10 px-3 w-[120px]">
                                                                        <span className="text-[#637381] text-[14px] mr-2">Từ số</span>
                                                                        <input type="text" defaultValue="00" className="flex-1 w-full bg-transparent border-none outline-none text-[14px] text-[#212B36] font-medium" />
                                                                        <div className="flex flex-col ml-1">
                                                                            <ChevronUp size={12} className="text-[#637381] cursor-pointer" />
                                                                            <ChevronDown size={12} className="text-[#637381] cursor-pointer" />
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[#637381]">-</span>
                                                                    <div className="flex items-center bg-white border border-[#E5E8EB] rounded-lg h-10 px-3 w-[120px]">
                                                                        <span className="text-[#637381] text-[14px] mr-2">Đến số</span>
                                                                        <input type="text" defaultValue="99" className="flex-1 w-full bg-transparent border-none outline-none text-[14px] text-[#212B36] font-medium" />
                                                                        <div className="flex flex-col ml-1">
                                                                            <ChevronUp size={12} className="text-[#637381] cursor-pointer" />
                                                                            <ChevronDown size={12} className="text-[#637381] cursor-pointer" />
                                                                        </div>
                                                                    </div>
                                                                    <button className="h-10 px-4 rounded-lg border border-[#ee1314] text-[#ee1314] text-[14px] font-medium bg-white hover:bg-[#FFF4F4] flex items-center gap-1 transition-colors">
                                                                        <span className="text-[18px] leading-none mb-[2px]">+</span> Thêm khoảng
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="text-[14px] font-bold text-[#212B36] uppercase mb-3">Khoảng đã chọn ({rangeCheckedBoxes.length})</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {rangeCheckedBoxes.map((range, idx) => (
                                                                        <div key={idx} className="h-9 px-3 rounded-lg border border-[#FFEBEE] bg-[#FFF4F4] text-[#ee1314] text-[14px] flex items-center gap-2">
                                                                            <span>{range}</span>
                                                                            <i 
                                                                                className="fa-solid fa-xmark text-[#ee1314] opacity-50 text-[14px] cursor-pointer hover:opacity-100"
                                                                                onClick={() => setRangeCheckedBoxes(prev => prev.filter(r => r !== range))}
                                                                            ></i>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {filterActiveTab === 'all' && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                                                            <div className="mb-4">
                                                                <h4 className="font-bold text-[14px] text-[#212B36] uppercase mb-1">Tất cả dãy số</h4>
                                                                <p className="text-[14px] text-[#637381]">Hiển thị toàn bộ các dãy số có sẵn của đài.</p>
                                                            </div>
                                                            <div className="text-center py-10 text-[#919EAB] border border-dashed border-[#E5E8EB] rounded-xl bg-[#fafafa]">
                                                                Toàn bộ dãy số sẽ hiển thị ở đây
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bottom Actions */}
                                            <div className="p-4 border-t border-[#E5E8EB] flex justify-end gap-3 bg-white">
                                                <button onClick={() => setIsFilterOpen(false)} className="px-6 py-2.5 rounded-lg border border-[#E5E8EB] text-[#212B36] text-[14px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                                                    <Trash2 size={16} className="text-[#637381]" /> Xóa bộ lọc
                                                </button>
                                                <button onClick={() => setIsFilterOpen(false)} className="px-6 py-2.5 rounded-lg bg-[#ee1314] text-white text-[14px] font-bold shadow-sm hover:bg-[#d11112] transition-colors flex items-center gap-2">
                                                    <Filter size={16} className="text-white" /> Áp dụng
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ticket List Section */}
                            <div className="p-4 lg:p-5 flex-1 flex flex-col">
                                {/* Title */}
                                <h2 className="font-bold text-[14px] text-[#212B36] uppercase mb-5">
                                    DANH SÁCH VÉ SỐ - {activeProvinces.length > 1 ? 'CÁC ĐÀI MIỀN NAM' : (activeProvinces.length === 1 ? activeProvinces[0].name?.toUpperCase() : 'CHƯA CHỌN ĐÀI')} - {activeProvinces.length > 0 ? (activeProvinces.length === 1 ? activeProvinces[0].time : '16:15') : '--:--'} - {selectedDates.length > 1 ? 'NHIỀU NGÀY' : (selectedDates[0] === 'today' ? 'HÔM NAY' : (selectedDates[0] === 'tomorrow' ? 'NGÀY MAI' : 'CHƯA CHỌN NGÀY'))}
                                </h2>

                                {/* Tickets Grid (4 columns) */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5 flex-1 content-start">
                                    {selectedProvinces.length === 0 ? (
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
                                            const ticketImage = ticket.ticketImg;

                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => toggleNumber(num)}
                                                    className={`relative border rounded-[20px] p-3 flex flex-col items-center cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md
                                                        ${isSelected ? 'border-[#ee1314] bg-[#FFF4F4]/30' : 'border-[#E5E8EB] bg-white'}
                                                    `}
                                                >


                                                    {/* Image */}
                                                    <div className="w-full h-[75px] mb-3 flex justify-center items-center">
                                                        <img src={ticketImage} alt="Vé số" className="w-[100%] max-h-full object-contain mix-blend-multiply" />
                                                    </div>

                                                    {/* Number */}
                                                    <div className="font-black text-[20px] text-[#212B36] tracking-tight mb-1.5 leading-none">{num}</div>

                                                    {/* Price */}
                                                    <div className="font-bold text-[#ee1314] text-[14px]">{(ticket.price || 10000).toLocaleString('vi-VN')}đ</div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full py-10 flex flex-col items-center justify-center text-[#637381] gap-2">
                                            <i className="fa-solid fa-box-open text-3xl opacity-50"></i>
                                            <span>Không có vé số nào cho đài này.</span>
                                        </div>
                                    )}
                                </div>

                                {/* Xem thêm */}
                                {availableTickets.length > 0 && (
                                    <div className="flex justify-center mt-8 mb-2">
                                        <button className="flex items-center gap-2 border border-[#E5E8EB] rounded-full px-6 py-2.5 bg-white text-[#212B36] font-medium hover:bg-gray-50 transition-colors shadow-sm">
                                            Xem thêm vé số <ChevronDown size={16} className="text-[#637381]" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full xl:w-[360px] shrink-0 flex flex-col gap-4">
                        {/* Main Checkout Card */}
                        <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] flex flex-col overflow-hidden mx-1">
                            {/* Red Header */}
                            <div className="bg-[#cc0000] text-white px-5 py-4 flex items-center">
                                <h3 className="font-bold text-[14px] uppercase">Chi tiết vé</h3>
                            </div>

                            <div className="p-5">
                                {/* Province Info */}
                                {selectedTicketProvinces.length > 0 && (
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center shadow-sm p-1.5 shrink-0 border border-[#E5E8EB]">
                                            {selectedTicketProvinces.length === 1 ? (
                                                <img src={selectedTicketProvinces[0].icon} alt={selectedTicketProvinces[0].name} className="w-full h-full object-contain" />
                                            ) : (
                                                <i className="fa-solid fa-building text-[#637381] text-2xl"></i>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[14px] text-[#212B36] mb-1">Vé số {selectedTicketProvinces.length === 1 ? selectedTicketProvinces[0].name : 'Các đài miền Nam'}</div>
                                            <div className="text-[14px] text-[#637381]">Mở thưởng: {selectedTicketProvinces.length > 0 ? (selectedTicketProvinces.length === 1 ? selectedTicketProvinces[0].time : '16:15') : '--:--'} - {selectedDates.length > 1 ? 'Nhiều ngày' : (selectedDates[0] === 'today' ? 'Hôm nay' : (selectedDates[0] === 'tomorrow' ? 'Ngày mai' : ''))}</div>
                                            <div className="text-[14px] text-[#637381] mt-0.5">Ngày: {selectedDates.length > 1 ? 'Nhiều ngày' : (selectedDates[0] === 'today' ? dayjs().format('DD/MM/YYYY') : (selectedDates[0] === 'tomorrow' ? dayjs().add(1, 'day').format('DD/MM/YYYY') : '--/--/----'))}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-[#E5E8EB] -mx-5 mb-5"></div>

                                {/* Selected Numbers */}
                                <div className="flex justify-between items-start mb-5">
                                    <span className="text-[14px] font-bold text-[#212B36] uppercase mt-1.5 shrink-0">Dãy số đã chọn</span>
                                    {selectedNumbers.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 justify-end pl-4">
                                            {selectedNumbers.map(num => (
                                                <div key={num} className="bg-[#FFF4F4] text-[#ee1314] px-2.5 py-1 rounded-lg text-[14px] font-bold tracking-[1px] border border-[#FFEBEE] shadow-sm">
                                                    {num}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[14px] text-[#919EAB] italic mt-1.5">Trống</span>
                                    )}
                                </div>

                                {/* Quantity Selector */}
                                <div className="flex items-center justify-between mb-4 mt-2">
                                    <span className="text-[14px] text-[#637381]">Số lượng vé</span>
                                    <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E5E8EB] p-1 h-9 w-[100px]">
                                        <button
                                            onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                                            disabled={ticketQuantity <= 1}
                                            className="flex-1 h-full flex items-center justify-center text-[#212B36] hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                        >
                                            <i className="fa-solid fa-minus text-[14px]"></i>
                                        </button>
                                        <span className="w-8 text-center text-[14px] font-bold text-[#212B36] border-x border-[#E5E8EB] h-full flex items-center justify-center">{ticketQuantity}</span>
                                        <button
                                            onClick={() => setTicketQuantity(Math.min(maxAvailable, ticketQuantity + 1))}
                                            disabled={ticketQuantity >= maxAvailable}
                                            className="flex-1 h-full flex items-center justify-center text-[#212B36] hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                        >
                                            <i className="fa-solid fa-plus text-[14px]"></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[14px] text-[#637381]">Thành tiền</span>
                                    <span className="text-[#ee1314] font-bold text-[14px]">{(ticketQuantity * pricePerTicket).toLocaleString('vi-VN')}đ</span>
                                </div>

                                <div className="border-t border-dashed border-[#E5E8EB] -mx-5 mb-5"></div>

                                {/* Total & Action Bottom */}
                                <div className="flex justify-between items-center mb-6 pt-2">
                                    <span className="text-[14px] font-bold text-[#212B36] uppercase">Tổng thanh toán</span>
                                    <span className="text-[24px] font-black text-[#ee1314] leading-none">{totalAmount.toLocaleString('vi-VN')}đ</span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={addToCart}
                                        disabled={totalQuantity === 0}
                                        className="w-full py-3.5 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] hover:bg-[#d00f10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-[#ee1314]/20"
                                    >
                                        <i className="fa-solid fa-cart-shopping"></i> Thêm vào giỏ hàng
                                    </button>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={totalQuantity === 0}
                                        className="w-full py-3.5 bg-white text-[#ee1314] font-bold rounded-xl border border-[#ee1314] text-[14px] hover:bg-[#FFF4F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-bolt"></i> Mua ngay
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Guide Section */}
                        <div className="bg-[#fafafa] rounded-[20px] p-5 mt-2 mx-1">
                            <div className="flex justify-between items-center mb-5">
                                <h4 className="font-bold text-[14px] uppercase text-[#212B36]">Hướng dẫn mua vé</h4>
                                <a href="#" className="text-[#637381] text-[14px] flex items-center gap-1 hover:text-[#ee1314]">Xem chi tiết <ChevronRight size={14} /></a>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">1</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Chọn ngày quay</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Chọn ngày mở thưởng</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">2</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Chọn đài</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Chọn tỉnh thành đài mở thưởng</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">3</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Chọn số</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Chọn hoặc tạo dãy số bạn yêu thích</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">4</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Thêm vào giỏ hàng</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Kiểm tra lại và tiến hành thanh toán</div>
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

