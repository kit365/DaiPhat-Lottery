import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { Trash2, ChevronRight, Minus, Plus, ShieldCheck, ArrowRight, CheckCircle2, Clock, Info } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';

export const CartPage = () => {
    const navigate = useNavigate();
    const { items, updateQuantity, removeItem, clearCart, addItem } = useCartStore();
    const { token, openLoginModal } = useAuthStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Auto-select new items
    useEffect(() => {
        setSelectedIds(items.map(i => i.id));
    }, [items.length]);

    const toggleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(i => i.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleClearCart = () => {
        const remainingIds = selectedIds.filter(id => !selectedIds.includes(id));
        selectedIds.forEach(id => removeItem(id));
        setSelectedIds(remainingIds);
    };

    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalTickets = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div 
            className="min-h-screen font-client-main flex flex-col pb-20 bg-fixed bg-cover bg-center"
            style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
        >
            <Header />

            {/* Top Section for Breadcrumb & Title (Transparent to show background) */}
            <div className="w-full mt-[70px] lg:mt-[80px] py-4 lg:py-6">
                <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[13px] text-[#637381] mb-2 font-medium">
                            <Link to="/" className="hover:text-[#ee1314] transition-colors">Trang chủ</Link>
                            <ChevronRight size={14} />
                            <span className="text-[#212B36] font-medium">Giỏ hàng</span>
                        </div>
                        <h1 className="text-[24px] md:text-[28px] font-bold text-[#212B36] mb-1 tracking-tight">Giỏ hàng</h1>
                        <p className="text-[13px] text-[#637381]">Kiểm tra lại vé số trước khi thanh toán</p>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 flex flex-col">

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* Left Content */}
                    <div className="flex-1 w-full flex flex-col gap-6">

                        {/* Header & Items List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
                            <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#E5E8EB]">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${items.length > 0 && selectedIds.length === items.length ? 'bg-[#ee1314] border-[#ee1314]' : 'bg-white border-gray-300 group-hover:border-[#ee1314]'}`}>
                                        {items.length > 0 && selectedIds.length === items.length && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} />
                                    <span className="text-[15px] font-bold text-[#212B36]">Chọn tất cả ({items.length})</span>
                                </label>
                                <button
                                    onClick={handleClearCart}
                                    disabled={selectedIds.length === 0}
                                    className="flex items-center gap-1.5 text-[14px] font-medium text-[#637381] hover:text-[#ee1314] transition-colors disabled:opacity-50"
                                >
                                    <Trash2 size={16} /> Xóa đã chọn
                                </button>
                            </div>

                            <div className="space-y-4">
                                {items.map((item) => {
                                    const isSelected = selectedIds.includes(item.id);
                                    // Parse numbers: if it has spaces, maybe it's Mega/Power, else it's traditional
                                    const numArr = item.numbers.split(' ');
                                    const isMegaPower = numArr.length > 1;

                                    return (
                                        <div key={item.id} className={`flex flex-col p-4 border rounded-xl transition-all ${isSelected ? 'border-[#ee1314] bg-[#FFF4F4]/30' : 'border-[#E5E8EB] hover:border-gray-300'}`}>
                                            <div className="flex gap-4">
                                                <label className="cursor-pointer group pt-1">
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#ee1314] border-[#ee1314]' : 'bg-white border-gray-300 group-hover:border-[#ee1314]'}`}>
                                                        {isSelected && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleSelect(item.id)} />
                                                </label>

                                                <div className="flex-1 flex justify-between">
                                                    {/* Left side: Logo + Info + Numbers */}
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-full border border-gray-100 shadow-sm p-1 bg-white flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                                                            <img src="https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png" alt="Logo" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <h3 className="font-bold text-[#212B36] text-[16px]">Vé số {item.province}</h3>
                                                            <div className="text-[12px] text-[#637381] mt-0.5 mb-3">Kỳ quay: #{item.kyHieu} • {item.date}</div>

                                                            <div>
                                                                {isMegaPower ? (
                                                                    <div className="flex gap-2 flex-wrap">
                                                                        {numArr.map((n, i) => (
                                                                            <div key={i} className="w-9 h-9 rounded-full border border-[#ee1314] flex items-center justify-center text-[15px] font-bold text-[#212B36] bg-white shadow-sm">
                                                                                {n}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 bg-[#FFF4F4] rounded-lg px-4 py-2 w-max border border-[#FFEBEE]">
                                                                        <span className="text-[12px] text-[#637381]">Mã vé:</span>
                                                                        <span className="text-[18px] font-bold text-[#ee1314] tracking-widest">{item.numbers}</span>
                                                                        <i className="fa-regular fa-copy text-[14px] text-gray-400 cursor-pointer hover:text-[#ee1314] ml-2"></i>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right side: Price & Actions */}
                                                    <div className="flex flex-col items-end justify-between">
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <div className="text-[16px] font-bold text-[#ee1314]">
                                                                {(item.price).toLocaleString('vi-VN')}đ
                                                            </div>
                                                            <button onClick={() => removeItem(item.id)} className="text-[#637381] hover:text-[#ee1314] transition-colors">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center border border-[#E5E8EB] rounded-lg bg-white h-8 w-[100px] overflow-hidden">
                                                            <button onClick={() => updateQuantity(item.id, -1)} className="flex-1 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50"><Minus size={14} /></button>
                                                            <span className="w-8 h-full flex items-center justify-center text-[14px] font-bold text-[#212B36] border-x border-[#E5E8EB]">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, 1)} className="flex-1 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50"><Plus size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {items.length === 0 && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-24 h-24 mb-4 opacity-50"><i className="fa-solid fa-cart-arrow-down text-[60px] text-gray-300"></i></div>
                                        <p className="text-[16px] text-[#212B36] font-medium mb-2">Giỏ hàng của bạn đang trống.</p>
                                        <button onClick={() => navigate('/mua-ve')} className="text-[#ee1314] font-bold hover:underline">Mua vé ngay</button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">

                        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-6 sticky top-[100px]">
                            <h3 className="text-[18px] font-bold text-[#212B36] mb-5 border-b border-[#E5E8EB] pb-4">Thông tin đơn hàng</h3>

                            <div className="space-y-4 mb-5 text-[14px]">
                                <div className="flex justify-between items-center text-[#637381]">
                                    <span>Tạm tính ({totalTickets} vé)</span>
                                    <span className="text-[#212B36] font-bold">{totalAmount.toLocaleString('vi-VN')}đ</span>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-[#E5E8EB] my-5"></div>

                            <div className="flex justify-between items-end mb-5">
                                <span className="text-[16px] font-bold text-[#212B36]">Tổng thanh toán</span>
                                <span className="text-[26px] font-bold text-[#ee1314] leading-none">{totalAmount.toLocaleString('vi-VN')}đ</span>
                            </div>

                            <button
                                onClick={() => {
                                    if (!token) {
                                        openLoginModal();
                                        return;
                                    }
                                    navigate('/checkout');
                                }}
                                disabled={selectedItems.length === 0}
                                className="w-full py-3.5 bg-[#ee1314] text-white font-bold rounded-xl hover:bg-[#d00f10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#ee1314]/20 mb-6"
                            >
                                <i className="fa-solid fa-lock"></i> Thanh toán
                            </button>

                            {/* Trust Badges */}
                            <div className="bg-[#F6FDFA] border border-[#E8F8F0] rounded-xl p-4 flex gap-3 mb-4">
                                <ShieldCheck className="text-[#00A76F] shrink-0" size={24} />
                                <div>
                                    <div className="font-bold text-[13px] text-[#00A76F]">Mua vé số an toàn</div>
                                    <div className="text-[12px] text-[#637381] mt-0.5">Thông tin được bảo mật tuyệt đối<br />Xác nhận kết quả nhanh chóng</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#F4F6F8] flex items-center justify-center text-[#637381] shrink-0"><Clock size={16} /></div>
                                    <div>
                                        <div className="font-bold text-[13px] text-[#212B36]">Kết quả nhanh chóng</div>
                                        <div className="text-[12px] text-[#637381]">Cập nhật kết quả ngay khi có</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#F4F6F8] flex items-center justify-center text-[#637381] shrink-0"><ShieldCheck size={16} /></div>
                                    <div>
                                        <div className="font-bold text-[13px] text-[#212B36]">Thanh toán bảo mật</div>
                                        <div className="text-[12px] text-[#637381]">Đa dạng phương thức an toàn</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#F4F6F8] flex items-center justify-center text-[#637381] shrink-0"><i className="fa-solid fa-headset text-[14px]"></i></div>
                                    <div>
                                        <div className="font-bold text-[13px] text-[#212B36]">Hỗ trợ 24/7</div>
                                        <div className="text-[12px] text-[#637381]">Sẵn sàng giải đáp mọi thắc mắc</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </main>

            {/* Bottom Banner */}
            <div className="bg-[#FFF4F4] py-8 mt-12 border-t border-[#FFEBEE]">
                <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <i className="fa-regular fa-user text-[32px] text-[#ee1314]"></i>
                            <div>
                                <div className="font-bold text-[15px] text-[#ee1314]">Hơn 10 triệu</div>
                                <div className="text-[13px] text-[#637381]">Khách hàng tin tưởng</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <ShieldCheck className="text-[#ee1314]" size={36} strokeWidth={1.5} />
                            <div>
                                <div className="font-bold text-[15px] text-[#ee1314]">Minh bạch - Uy tín</div>
                                <div className="text-[13px] text-[#637381]">Được cấp phép bởi Bộ Tài Chính</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <i className="fa-solid fa-lock text-[32px] text-[#ee1314]"></i>
                            <div>
                                <div className="font-bold text-[15px] text-[#ee1314]">Thanh toán an toàn</div>
                                <div className="text-[13px] text-[#637381]">Bảo mật tuyệt đối</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <i className="fa-solid fa-truck-fast text-[32px] text-[#ee1314]"></i>
                            <div>
                                <div className="font-bold text-[15px] text-[#ee1314]">Giao dịch nhanh chóng</div>
                                <div className="text-[13px] text-[#637381]">Xác nhận trong 3 giây</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
