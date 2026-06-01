import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { Trash2, ChevronRight, Minus, Plus, ShieldCheck, Truck, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';

const SUGGESTIONS = [
    { province: "Đồng Nai", time: "16:20 • Hôm nay", price: 10000, icon: "DN" },
    { province: "Cần Thơ", time: "16:15 • Hôm nay", price: 10000, icon: "CT" },
    { province: "Sóc Trăng", time: "16:15 • Hôm nay", price: 10000, icon: "ST" },
    { province: "Bạc Liêu", time: "16:20 • Hôm nay", price: 10000, icon: "BL" },
    { province: "Vũng Tàu", time: "16:20 • Hôm nay", price: 10000, icon: "VT" },
    { province: "Tây Ninh", time: "16:30 • Hôm nay", price: 10000, icon: "TN" },
];

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
        clearCart();
        setSelectedIds([]);
    };

    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalTickets = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif] pb-20">
            <Header />
            
            <main className="max-w-[1200px] mx-auto px-4 pt-28">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-[14px] text-[#637381] mb-6">
                    <Link to="/" className="hover:text-[#BA0000] transition-colors">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <span className="text-[#212B36] font-medium">Giỏ hàng</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Content */}
                    <div className="flex-1 w-full flex flex-col gap-6">
                        
                        {/* Header & Items List */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#E5E8EB]">
                                <div className="flex items-center gap-2 text-[20px] font-bold text-[#212B36]">
                                    <i className="fa-solid fa-cart-shopping text-[#BA0000]"></i>
                                    Giỏ hàng của bạn <span className="text-[#637381] font-normal text-[16px]">({items.length})</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={items.length > 0 && selectedIds.length === items.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 accent-[#BA0000]"
                                        />
                                        <span className="text-[14px] text-[#212B36]">Chọn tất cả</span>
                                    </label>
                                    <button 
                                        onClick={handleClearCart}
                                        className="flex items-center gap-1 text-[14px] text-[#BA0000] hover:underline"
                                    >
                                        <Trash2 size={16} /> Xóa tất cả
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-[#E5E8EB] rounded-lg relative hover:border-[#BA0000] transition-colors items-start sm:items-center">
                                        
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                            className="w-5 h-5 accent-[#BA0000] rounded cursor-pointer shrink-0 mt-2 sm:mt-0"
                                        />
                                        
                                        <div className="w-full sm:w-[280px] h-[130px] rounded flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
                                            <img src="https://i.imgur.com/V4b7V3x.jpeg" alt="Vé số" className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 w-full h-full">
                                            <div className="flex flex-col justify-center">
                                                <div className="inline-block px-2 py-0.5 bg-[#FFF4F4] text-[#BA0000] text-[11px] font-bold rounded mb-2 self-start">Sắp mở thưởng</div>
                                                <h3 className="font-bold text-[#212B36] text-[16px] mb-2">Xổ số {item.province} {item.kyHieu}</h3>
                                                <div className="text-[13px] text-[#637381] space-y-1">
                                                    <p><i className="fa-regular fa-calendar w-4 text-center"></i> Ngày mở thưởng: {item.date}</p>
                                                    <p><i className="fa-solid fa-location-dot w-4 text-center"></i> Khu vực: {item.province}</p>
                                                    <p><i className="fa-regular fa-clock w-4 text-center"></i> Giờ mở thưởng: {item.time}</p>
                                                    <p><i className="fa-solid fa-print w-4 text-center"></i> Hình thức: Vé số truyền thống</p>
                                                    <p><i className="fa-solid fa-ticket w-4 text-center"></i> Ký hiệu: {item.kyHieu}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between min-w-[140px] border-t md:border-t-0 border-[#E5E8EB] pt-4 md:pt-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center border border-[#E5E8EB] rounded bg-white h-8">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-[#637381] hover:bg-gray-50"><Minus size={14}/></button>
                                                        <span className="w-8 text-center text-[14px] font-medium">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-[#637381] hover:bg-gray-50"><Plus size={14}/></button>
                                                    </div>
                                                    <button onClick={() => { removeItem(item.id); setSelectedIds(prev => prev.filter(i => i !== item.id)); }} className="w-8 h-8 flex items-center justify-center text-[#BA0000] bg-[#FFF4F4] rounded hover:bg-[#ffe4e4] transition-colors" title="Xóa vé này">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                                <div className="text-[18px] font-bold text-[#BA0000] md:mt-auto md:pb-1">
                                                    {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {items.length === 0 && (
                                    <div className="py-12 text-center text-[#637381]">Giỏ hàng của bạn đang trống.</div>
                                )}
                            </div>
                        </div>

                        {/* Suggestions */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <h3 className="text-[16px] font-bold text-[#212B36] mb-4">Gợi ý cho bạn</h3>
                            <div className="flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                {SUGGESTIONS.map((s, i) => (
                                    <div key={i} className="min-w-[140px] border border-[#E5E8EB] rounded-lg p-4 flex flex-col items-center text-center hover:border-[#BA0000] transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[14px] font-bold text-slate-500 mb-2 border-2 border-white shadow-sm group-hover:scale-110 transition-transform">
                                            {s.icon}
                                        </div>
                                        <div className="font-bold text-[14px] text-[#212B36]">{s.province}</div>
                                        <div className="text-[12px] text-[#637381] mt-1">{s.time}</div>
                                        <div className="text-[14px] font-bold text-[#BA0000] my-2">{s.price.toLocaleString('vi-VN')} đ</div>
                                        <button 
                                            onClick={() => {
                                                if (!token) {
                                                    openLoginModal();
                                                    return;
                                                }
                                                addItem({ province: s.province, date: "Hôm nay, 09/02/2025", time: "16:20", kyHieu: "2K2", numbers: Math.floor(100000 + Math.random() * 900000).toString(), price: s.price, quantity: 1, color: "#f59e0b" });
                                            }}
                                            className="text-[12px] font-medium border border-[#E5E8EB] rounded px-3 py-1 hover:border-[#BA0000] hover:text-[#BA0000] transition-colors w-full"
                                        >
                                            + Thêm
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-3 gap-4 border-t border-[#E5E8EB] pt-6 mt-2">
                            <div className="flex items-center gap-3">
                                <div className="text-[#BA0000]"><ShieldCheck size={32} strokeWidth={1.5} /></div>
                                <div>
                                    <div className="font-bold text-[14px] text-[#212B36]">Vé số chính hãng 100%</div>
                                    <div className="text-[12px] text-[#637381]">Từ các công ty xổ số kiến thiết</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-[#BA0000]"><i className="fa-solid fa-money-bill-transfer text-[28px]"></i></div>
                                <div>
                                    <div className="font-bold text-[14px] text-[#212B36]">Hoàn tiền nếu không có vé</div>
                                    <div className="text-[12px] text-[#637381]">Cam kết hoàn tiền 100%</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-[#BA0000]"><i className="fa-solid fa-lock text-[28px]"></i></div>
                                <div>
                                    <div className="font-bold text-[14px] text-[#212B36]">Thanh toán an toàn</div>
                                    <div className="text-[12px] text-[#637381]">Đa dạng phương thức</div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-6">
                        
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <h3 className="text-[18px] font-bold text-[#212B36] mb-6">Thông tin đơn hàng</h3>
                            
                            <div className="space-y-4 mb-6 text-[14px]">
                                <div className="flex justify-between text-[#637381]">
                                    <span>Tạm tính ({totalTickets} vé)</span>
                                    <span className="text-[#212B36] font-medium">{totalAmount.toLocaleString('vi-VN')} đ</span>
                                </div>
                                <div className="flex justify-between text-[#637381]">
                                    <span>Phí giao vé (nếu có)</span>
                                    <span className="text-[#212B36] font-medium">0 đ</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 mb-6">
                                <span className="text-[16px] font-bold text-[#212B36]">Tổng tiền</span>
                                <span className="text-[24px] font-bold text-[#BA0000]">{totalAmount.toLocaleString('vi-VN')} đ</span>
                            </div>

                            <div className="bg-[#FFF4F4] rounded-lg p-4 flex gap-3 mb-6">
                                <ShieldCheck className="text-[#BA0000] shrink-0" size={24} />
                                <div>
                                    <div className="font-bold text-[13px] text-[#212B36]">Giao dịch bảo mật 100%</div>
                                    <div className="text-[12px] text-[#637381] mt-0.5">Thông tin của bạn luôn được bảo vệ</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => {
                                        if (!token) {
                                            openLoginModal();
                                            return;
                                        }
                                        navigate('/checkout');
                                    }}
                                    disabled={selectedItems.length === 0}
                                    className="w-full py-3.5 bg-[#BA0000] text-white font-bold rounded-lg hover:bg-[#990000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-lock"></i> Tiến hành thanh toán
                                </button>
                                <button 
                                    onClick={() => navigate('/')}
                                    className="w-full py-3.5 bg-white text-[#212B36] font-semibold rounded-lg border border-[#E5E8EB] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={18} /> Tiếp tục mua vé
                                </button>
                            </div>

                            <div className="bg-[#F6FDFA] rounded-lg p-4 flex gap-3 mt-6 border border-[#E8F8F0]">
                                <Truck className="text-[#00A76F] shrink-0" size={24} />
                                <div>
                                    <div className="font-bold text-[13px] text-[#212B36]">Giao vé nhanh chóng</div>
                                    <div className="text-[12px] text-[#637381] mt-0.5">Vé số được trả thưởng vào ví nếu có trúng thưởng</div>
                                </div>
                            </div>
                        </div>

                        {/* Promo Banner */}
                        <div className="bg-[#BA0000] rounded-xl shadow-sm p-6 relative overflow-hidden text-white flex flex-col justify-center min-h-[200px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-20"></div>
                            <div className="relative z-10">
                                <h3 className="text-[20px] font-extrabold uppercase leading-tight mb-2">MUA VÉ SỐ DỄ DÀNG<br/>TRÚNG LỚN MỖI NGÀY!</h3>
                                <ul className="text-[12px] space-y-1 mb-4 opacity-90">
                                    <li>✓ Vé số chính hãng 100%</li>
                                    <li>✓ Thanh toán nhanh chóng</li>
                                    <li>✓ Kết quả cập nhật nhanh nhất</li>
                                </ul>
                                <button className="bg-white text-[#BA0000] text-[13px] font-bold px-5 py-2 rounded shadow hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                                    Mua vé ngay <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};
