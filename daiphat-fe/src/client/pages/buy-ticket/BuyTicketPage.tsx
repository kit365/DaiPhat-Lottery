import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { ChevronRight, Calendar as CalendarIcon, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast as toast } from '../../utils/toast.util';

const PROVINCES = [
    { id: 'hcm', name: 'TP. Hồ Chí Minh', time: '16:15', day: 'Hôm nay', icon: 'https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png' },
    { id: 'dn', name: 'Đồng Nai', time: '16:20', day: 'Hôm nay', icon: 'https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png' },
    { id: 'ct', name: 'Cần Thơ', time: '16:15', day: 'Hôm nay', icon: 'https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png' },
];

const QUICK_NUMBERS = [
    '00000', '11111', '22222', '33333', '44444',
    '55555', '66666', '77777', '88888', '99999',
    '12345', '23456', '34567', '45678', '56789',
    '67890', '13579', '24680', '112233', '221122'
];

export const BuyTicketPage = () => {
    const navigate = useNavigate();
    const { token, openLoginModal } = useAuthStore();
    
    // State
    const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
    const [selectedProvince, setSelectedProvince] = useState('hcm');
    const [selectedTab, setSelectedTab] = useState<'quick' | 'manual' | 'birthday'>('quick');
    const [selectedNumbers, setSelectedNumbers] = useState<string[]>(['853911']);

    const toggleNumber = (num: string) => {
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else {
            setSelectedNumbers([num]);
        }
    };

    const activeProvinceObj = PROVINCES.find(p => p.id === selectedProvince);
    const quantity = selectedNumbers.length;
    const pricePerTicket = 10000;
    const totalAmount = quantity * pricePerTicket;

    const addToCart = () => {
        if (!token) {
            openLoginModal();
            return false;
        }
        if (!activeProvinceObj || selectedNumbers.length === 0) return false;
        
        selectedNumbers.forEach(num => {
            useCartStore.getState().addItem({
                province: activeProvinceObj.name,
                date: selectedDate === 'today' ? `Hôm nay, 09/02/2025` : `Ngày mai, 10/02/2025`,
                time: activeProvinceObj.time,
                kyHieu: "2K2",
                numbers: num,
                price: pricePerTicket,
                quantity: 1,
                color: "#f59e0b"
            });
        });
        toast.success(`Đã thêm ${selectedNumbers.length} vé vào giỏ hàng`);
        return true;
    };

    const handleCheckout = () => {
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
                <div className="flex flex-col lg:flex-row gap-5 flex-1">
                    
                    {/* Left Content - Master Container */}
                    <div className="flex-1 w-full bg-white rounded-[20px] shadow-md border border-[#E5E8EB] flex flex-col h-fit">
                        
                        {/* 1. Chọn ngày mở thưởng */}
                        <div className="p-5 border-b border-[#E5E8EB] shrink-0">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">1</div>
                                <h2 className="text-[16px] font-bold text-[#212B36]">Chọn ngày mở thưởng</h2>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 max-w-[500px]">
                                {/* Today */}
                                <div 
                                    onClick={() => setSelectedDate('today')}
                                    className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-colors flex gap-3 items-center
                                        ${selectedDate === 'today' ? 'border-[#ee1314] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`${selectedDate === 'today' ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                                        <CalendarIcon size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-bold text-[14px] ${selectedDate === 'today' ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Hôm nay</div>
                                        <div className="text-[12px] text-[#637381] mt-0.5">09/02/2025 (Chủ nhật)</div>
                                    </div>
                                    {selectedDate === 'today' && (
                                        <div className="text-[#ee1314]">
                                            <CheckCircle2 size={24} className="fill-[#ee1314] text-white shadow-sm rounded-full" />
                                        </div>
                                    )}
                                </div>
                                {/* Tomorrow */}
                                <div 
                                    onClick={() => setSelectedDate('tomorrow')}
                                    className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-colors flex gap-3 items-center
                                        ${selectedDate === 'tomorrow' ? 'border-[#ee1314] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`${selectedDate === 'tomorrow' ? 'text-[#ee1314]' : 'text-[#637381]'}`}>
                                        <CalendarIcon size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-bold text-[14px] ${selectedDate === 'tomorrow' ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Ngày mai</div>
                                        <div className="text-[12px] text-[#637381] mt-0.5">10/02/2025 (Thứ hai)</div>
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
                                <h2 className="text-[16px] font-bold text-[#212B36]">Chọn đài mở thưởng (Miền Nam)</h2>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 max-w-[750px]">
                                {PROVINCES.map((prov) => (
                                    <div 
                                        key={prov.id}
                                        onClick={() => setSelectedProvince(prov.id)}
                                        className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-colors flex flex-col items-center text-center
                                            ${selectedProvince === prov.id ? 'border-[#ee1314] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                        `}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E5E8EB] mb-2 overflow-hidden p-1.5">
                                            <img src={prov.icon} alt={prov.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="font-bold text-[13px] text-[#212B36]">{prov.name}</div>
                                        <div className="text-[11px] mt-0.5 font-medium text-[#ee1314]">{prov.time} • {prov.day}</div>
                                        
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
                                            • {activeProvinceObj.name} • {activeProvinceObj.time} • {activeProvinceObj.day}
                                        </span>
                                    )}
                                </h2>
                            </div>
                            
                            {/* Pill Tabs */}
                            <div className="flex items-center gap-2 mb-5 shrink-0">
                                <button 
                                    onClick={() => setSelectedTab('quick')}
                                    className={`px-5 py-2 rounded-full text-[13px] font-bold transition-colors ${selectedTab === 'quick' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381] hover:bg-[#E5E8EB]'}`}
                                >
                                    Chọn nhanh
                                </button>
                                <button 
                                    onClick={() => setSelectedTab('manual')}
                                    className={`px-5 py-2 rounded-full text-[13px] font-bold transition-colors ${selectedTab === 'manual' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381] hover:bg-[#E5E8EB]'}`}
                                >
                                    Chọn số
                                </button>
                                <button 
                                    onClick={() => setSelectedTab('birthday')}
                                    className={`px-5 py-2 rounded-full text-[13px] font-bold transition-colors ${selectedTab === 'birthday' ? 'bg-[#FFF4F4] text-[#ee1314]' : 'bg-[#F4F6F8] text-[#637381] hover:bg-[#E5E8EB]'}`}
                                >
                                    Số theo ngày sinh
                                </button>
                            </div>

                            {/* Numbers Grid (10 columns) */}
                            <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5 flex-1 content-start shrink-0">
                                {QUICK_NUMBERS.map((num, i) => {
                                    const isSelected = selectedNumbers.includes(num);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => toggleNumber(num)}
                                            className={`py-2 rounded-lg border text-[13px] font-bold transition-colors
                                                ${isSelected ? 'bg-[#ee1314] border-[#ee1314] text-white' : 'border-[#E5E8EB] text-[#ee1314] hover:border-[#ee1314] hover:bg-[#FFF4F4]'}
                                            `}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-start mt-5 shrink-0">
                                <button 
                                    onClick={() => setSelectedNumbers([])}
                                    className="flex items-center gap-1.5 text-[#637381] hover:text-[#212B36] text-[13px] font-medium transition-colors"
                                >
                                    <RefreshCw size={14} /> Chọn lại
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[360px] shrink-0">
                        <div className="bg-white rounded-[20px] shadow-md border border-[#E5E8EB] p-5 flex flex-col sticky top-[100px]">
                            <h3 className="text-[18px] font-bold text-[#212B36] mb-5 shrink-0">Tóm tắt đơn hàng</h3>
                            
                            {/* Province Info */}
                            {activeProvinceObj && (
                                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#E5E8EB] shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#E5E8EB] shadow-sm p-1.5 overflow-hidden">
                                        <img src={activeProvinceObj.icon} alt={activeProvinceObj.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-[15px] text-[#212B36]">{activeProvinceObj.name}</div>
                                        <div className="text-[12px] text-[#637381] mt-0.5">{activeProvinceObj.time} • {activeProvinceObj.day}</div>
                                    </div>
                                </div>
                            )}

                            {/* Selected Numbers */}
                            <div className="flex justify-between items-start mb-5 shrink-0">
                                <div>
                                    <div className="text-[12px] text-[#637381] mb-1">Số đã chọn</div>
                                    <div className="text-[22px] font-black tracking-wider text-[#ee1314]">
                                        {selectedNumbers[0] || '---'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[12px] text-[#637381] mb-1">Số lượng</div>
                                    <div className="text-[14px] font-bold text-[#212B36]">{quantity} vé</div>
                                </div>
                            </div>

                            <div className="space-y-3 text-[13px] pt-4 border-t border-[#E5E8EB] shrink-0">
                                <div className="flex justify-between text-[#637381]">
                                    <span>Tạm tính</span>
                                    <span className="text-[#212B36] font-semibold">{totalAmount.toLocaleString('vi-VN')} đ</span>
                                </div>
                                <div className="flex justify-between text-[#637381]">
                                    <span className="flex items-center gap-1">Phí giao vé (nếu có) <i className="fa-regular fa-circle-question text-[11px]"></i></span>
                                    <span className="text-[#212B36] font-semibold">0 đ</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-[#E5E8EB] my-5 shrink-0">
                                <span className="text-[15px] font-bold text-[#212B36]">Tổng tiền</span>
                                <span className="text-[22px] font-bold text-[#ee1314]">{totalAmount.toLocaleString('vi-VN')} đ</span>
                            </div>

                            {/* Push buttons to bottom if space available */}
                            <div className="mt-auto shrink-0 flex flex-col gap-3">
                                <button 
                                    onClick={handleCheckout}
                                    disabled={quantity === 0}
                                    className="w-full py-3 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] hover:bg-[#B71C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#ee1314]/20"
                                >
                                    <i className="fa-solid fa-lock"></i> Thanh toán
                                </button>
                                <button 
                                    onClick={addToCart}
                                    disabled={quantity === 0}
                                    className="w-full py-3 bg-white text-[#212B36] font-bold rounded-xl border-2 border-[#E5E8EB] text-[14px] hover:border-[#ee1314] hover:text-[#ee1314] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Mua thêm vé
                                </button>
                            </div>

                            <div className="mt-5 flex gap-2.5 justify-center items-center shrink-0">
                                <ShieldCheck className="text-[#00A76F]" size={20} />
                                <div>
                                    <div className="font-bold text-[12px] text-[#212B36]">Giao dịch bảo mật 100%</div>
                                    <div className="text-[11px] text-[#637381]">Thông tin của bạn luôn được bảo vệ</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

