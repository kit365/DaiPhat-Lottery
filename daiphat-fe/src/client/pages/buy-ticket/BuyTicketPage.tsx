import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { ChevronRight, Calendar as CalendarIcon, CheckCircle2, ShieldCheck, RefreshCw, Grid } from 'lucide-react';

const PROVINCES = [
    { id: 'hcm', name: 'TP. Hồ Chí Minh', time: '16:15', day: 'Hôm nay', icon: 'HCM' },
    { id: 'dn', name: 'Đồng Nai', time: '16:20', day: 'Hôm nay', icon: 'DN' },
    { id: 'ct', name: 'Cần Thơ', time: '16:15', day: 'Hôm nay', icon: 'CT' },
    { id: 'st', name: 'Sóc Trăng', time: '16:15', day: 'Hôm nay', icon: 'ST' },
];

const QUICK_NUMBERS = [
    '00000', '11111', '22222', '33333', '44444',
    '55555', '66666', '77777', '88888', '99999',
    '12345', '23456', '34567', '45678', '56789',
    '67890', '13579', '24680', '112233', '221122'
];

export const BuyTicketPage = () => {
    const navigate = useNavigate();
    
    // State
    const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
    const [selectedProvince, setSelectedProvince] = useState('hcm');
    const [selectedTab, setSelectedTab] = useState<'quick' | 'manual' | 'birthday'>('quick');
    const [selectedNumbers, setSelectedNumbers] = useState<string[]>(['853911']);

    const toggleNumber = (num: string) => {
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else {
            setSelectedNumbers([num]); // Currently logic allows single selection for demo. Change to push for multiple.
        }
    };

    const activeProvinceObj = PROVINCES.find(p => p.id === selectedProvince);
    const quantity = selectedNumbers.length;
    const pricePerTicket = 10000;
    const totalAmount = quantity * pricePerTicket;

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif] pb-20">
            <Header />
            
            <main className="max-w-[1200px] mx-auto px-4 pt-28">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-[14px] text-[#637381] mb-6">
                    <Link to="/" className="hover:text-[#BA0000] transition-colors">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-[#212B36] font-medium">Mua vé số</span>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="text-[#BA0000] bg-[#FFF4F4] w-12 h-12 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-ticket text-[24px]"></i>
                    </div>
                    <div>
                        <h1 className="text-[24px] font-bold text-[#212B36]">Mua vé số</h1>
                        <p className="text-[#637381] text-[14px]">Chọn đài, chọn số và thanh toán</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    
                    {/* Left Content */}
                    <div className="flex-1 w-full flex flex-col gap-6">
                        
                        {/* 1. Chọn ngày mở thưởng */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-6 h-6 rounded-full bg-[#BA0000] text-white flex items-center justify-center text-[14px] font-bold">1</div>
                                <h2 className="text-[18px] font-bold text-[#212B36]">Chọn ngày mở thưởng</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Today */}
                                <div 
                                    onClick={() => setSelectedDate('today')}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors flex gap-4
                                        ${selectedDate === 'today' ? 'border-[#BA0000] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`mt-0.5 ${selectedDate === 'today' ? 'text-[#BA0000]' : 'text-[#637381]'}`}>
                                        <CalendarIcon size={24} />
                                    </div>
                                    <div>
                                        <div className={`font-bold text-[16px] ${selectedDate === 'today' ? 'text-[#BA0000]' : 'text-[#212B36]'}`}>Hôm nay</div>
                                        <div className="text-[13px] text-[#637381] mt-1">09/02/2025 (Chủ nhật)</div>
                                    </div>
                                    {selectedDate === 'today' && (
                                        <div className="absolute top-4 right-4 text-[#BA0000]">
                                            <CheckCircle2 size={20} className="fill-[#BA0000] text-white" />
                                        </div>
                                    )}
                                </div>
                                {/* Tomorrow */}
                                <div 
                                    onClick={() => setSelectedDate('tomorrow')}
                                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors flex gap-4
                                        ${selectedDate === 'tomorrow' ? 'border-[#BA0000] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`mt-0.5 ${selectedDate === 'tomorrow' ? 'text-[#BA0000]' : 'text-[#637381]'}`}>
                                        <CalendarIcon size={24} />
                                    </div>
                                    <div>
                                        <div className={`font-bold text-[16px] ${selectedDate === 'tomorrow' ? 'text-[#BA0000]' : 'text-[#212B36]'}`}>Ngày mai</div>
                                        <div className="text-[13px] text-[#637381] mt-1">10/02/2025 (Thứ hai)</div>
                                    </div>
                                    {selectedDate === 'tomorrow' && (
                                        <div className="absolute top-4 right-4 text-[#BA0000]">
                                            <CheckCircle2 size={20} className="fill-[#BA0000] text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Chọn đài mở thưởng */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-6 h-6 rounded-full bg-[#BA0000] text-white flex items-center justify-center text-[14px] font-bold">2</div>
                                <h2 className="text-[18px] font-bold text-[#212B36]">Chọn đài mở thưởng (Miền Nam)</h2>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {PROVINCES.map((prov) => (
                                    <div 
                                        key={prov.id}
                                        onClick={() => setSelectedProvince(prov.id)}
                                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors flex flex-col items-center text-center
                                            ${selectedProvince === prov.id ? 'border-[#BA0000] bg-[#FFF4F4]' : 'border-[#E5E8EB] hover:border-gray-300'}
                                        `}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[14px] font-bold text-slate-500 mb-3 border-2 border-white shadow-sm">
                                            {prov.icon}
                                        </div>
                                        <div className="font-bold text-[14px] text-[#212B36]">{prov.name}</div>
                                        <div className="text-[12px] text-[#637381] mt-1">{prov.time} • {prov.day}</div>
                                        
                                        {selectedProvince === prov.id && (
                                            <div className="absolute top-2 right-2 text-[#BA0000]">
                                                <CheckCircle2 size={18} className="fill-[#BA0000] text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <button className="w-full py-3 border border-[#E5E8EB] rounded-lg text-[14px] font-medium text-[#212B36] hover:bg-gray-50 transition-colors">
                                + Thêm đài khác
                            </button>
                        </div>

                        {/* 3. Chọn số */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#BA0000] text-white flex items-center justify-center text-[14px] font-bold">3</div>
                                <h2 className="text-[18px] font-bold text-[#212B36]">Chọn số</h2>
                                {activeProvinceObj && (
                                    <div className="ml-2 text-[14px] text-[#BA0000] font-medium">
                                        {activeProvinceObj.name} • {activeProvinceObj.time} • {activeProvinceObj.day}
                                    </div>
                                )}
                            </div>
                            
                            {/* Tabs */}
                            <div className="flex items-center gap-6 border-b border-[#E5E8EB] mb-6">
                                <button 
                                    onClick={() => setSelectedTab('quick')}
                                    className={`pb-3 text-[15px] font-bold transition-colors border-b-2 ${selectedTab === 'quick' ? 'border-[#BA0000] text-[#BA0000]' : 'border-transparent text-[#637381] hover:text-[#212B36]'}`}
                                >
                                    Chọn nhanh
                                </button>
                                <button 
                                    onClick={() => setSelectedTab('manual')}
                                    className={`pb-3 text-[15px] font-bold transition-colors border-b-2 ${selectedTab === 'manual' ? 'border-[#BA0000] text-[#BA0000]' : 'border-transparent text-[#637381] hover:text-[#212B36]'}`}
                                >
                                    Chọn số
                                </button>
                                <button 
                                    onClick={() => setSelectedTab('birthday')}
                                    className={`pb-3 text-[15px] font-bold transition-colors border-b-2 ${selectedTab === 'birthday' ? 'border-[#BA0000] text-[#BA0000]' : 'border-transparent text-[#637381] hover:text-[#212B36]'}`}
                                >
                                    Số theo ngày sinh
                                </button>
                            </div>

                            {/* Numbers Grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 mb-6">
                                {QUICK_NUMBERS.map((num, i) => {
                                    const isSelected = selectedNumbers.includes(num);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => toggleNumber(num)}
                                            className={`py-2 rounded border text-[15px] font-bold transition-colors
                                                ${isSelected ? 'bg-[#BA0000] border-[#BA0000] text-white' : 'border-[#E5E8EB] text-[#BA0000] hover:border-[#BA0000] hover:bg-[#FFF4F4]'}
                                            `}
                                        >
                                            {num}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between border-t border-[#E5E8EB] pt-4">
                                <button 
                                    onClick={() => setSelectedNumbers([])}
                                    className="flex items-center gap-2 text-[#637381] hover:text-[#212B36] text-[14px] font-medium transition-colors"
                                >
                                    <RefreshCw size={16} /> Chọn lại
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 border border-[#E5E8EB] rounded-lg text-[#212B36] text-[14px] font-medium hover:bg-gray-50 transition-colors">
                                    <Grid size={16} /> Chọn số khác <ChevronRight size={14} className="rotate-90" />
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[340px] shrink-0">
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6 sticky top-28">
                            <h3 className="text-[18px] font-bold text-[#212B36] mb-6">Tóm tắt đơn hàng</h3>
                            
                            {/* Province Info */}
                            {activeProvinceObj && (
                                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E8EB]">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[14px] font-bold text-slate-500 border-2 border-white shadow-sm">
                                        {activeProvinceObj.icon}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[16px] text-[#212B36]">{activeProvinceObj.name}</div>
                                        <div className="text-[13px] text-[#637381] mt-0.5">{activeProvinceObj.time} • {activeProvinceObj.day}</div>
                                    </div>
                                </div>
                            )}

                            {/* Selected Numbers */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-[13px] text-[#637381] mb-1">Số đã chọn</div>
                                    <div className="text-[24px] font-black tracking-widest text-[#BA0000]">
                                        {selectedNumbers[0] || '---'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[13px] text-[#637381] mb-1">Số lượng</div>
                                    <div className="text-[15px] font-bold text-[#212B36]">{quantity} vé</div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6 text-[14px] pt-6 border-t border-[#E5E8EB]">
                                <div className="flex justify-between text-[#637381]">
                                    <span>Tạm tính</span>
                                    <span className="text-[#212B36] font-medium">{totalAmount.toLocaleString('vi-VN')} đ</span>
                                </div>
                                <div className="flex justify-between text-[#637381]">
                                    <span className="flex items-center gap-1">Phí giao vé (nếu có) <i className="fa-regular fa-circle-question text-[12px]"></i></span>
                                    <span className="text-[#212B36] font-medium">0 đ</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-[#E5E8EB] mb-6">
                                <span className="text-[16px] font-bold text-[#212B36]">Tổng tiền</span>
                                <span className="text-[24px] font-bold text-[#BA0000]">{totalAmount.toLocaleString('vi-VN')} đ</span>
                            </div>

                            <div className="flex flex-col gap-3 mb-6">
                                <button 
                                    onClick={() => navigate('/checkout')}
                                    disabled={quantity === 0}
                                    className="w-full py-3.5 bg-[#BA0000] text-white font-bold rounded-lg hover:bg-[#990000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-lock"></i> Thanh toán
                                </button>
                                <button 
                                    onClick={() => {
                                        toast.success('Đã thêm vào giỏ hàng');
                                    }}
                                    disabled={quantity === 0}
                                    className="w-full py-3.5 bg-white text-[#BA0000] font-bold rounded-lg border-2 border-[#BA0000] hover:bg-[#FFF4F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Mua thêm vé
                                </button>
                            </div>

                            <div className="bg-[#F8F9FA] rounded-lg p-4 flex gap-3">
                                <ShieldCheck className="text-[#00A76F] shrink-0 mt-0.5" size={20} />
                                <div>
                                    <div className="font-bold text-[13px] text-[#212B36]">Giao dịch bảo mật 100%</div>
                                    <div className="text-[12px] text-[#637381] mt-0.5">Thông tin của bạn luôn được bảo vệ</div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};
