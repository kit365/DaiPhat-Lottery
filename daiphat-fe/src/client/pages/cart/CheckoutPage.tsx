import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { Trash2, ChevronRight, Minus, Plus, ShieldCheck, ArrowLeft, Store, CreditCard, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast as toast } from '../../utils/toast.util';

export const CheckoutPage = () => {
    const navigate = useNavigate();
    const { items, updateQuantity, removeItem, clearCart } = useCartStore();
    const { token, openLoginModal } = useAuthStore();
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');

    React.useEffect(() => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để tiếp tục thanh toán");
            openLoginModal();
            navigate('/cart', { replace: true });
        }
    }, [token, navigate, openLoginModal]);

    const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0);
    const subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 0; // No delivery fee since it's pickup only
    const totalAmount = subTotal + deliveryFee;

    const handleCheckout = () => {
        // Mock checkout API call
        toast.success("Thanh toán thành công! Vui lòng đến cửa hàng để nhận vé.");
        clearCart();
        navigate('/'); // Navigate to home or success page
    };

    return (
        <div 
            className="min-h-screen font-client-main flex flex-col bg-fixed bg-cover bg-center pb-20"
            style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
        >
            <Header />

            {/* Top Section for Breadcrumb & Title */}
            <div className="w-full mt-[70px] lg:mt-[80px] py-4 lg:py-6">
                <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[13px] text-[#637381] mb-2 font-medium">
                            <Link to="/" className="hover:text-[#ee1314] transition-colors">Trang chủ</Link>
                            <ChevronRight size={14} />
                            <Link to="/cart" className="hover:text-[#ee1314] transition-colors">Giỏ hàng</Link>
                            <ChevronRight size={14} />
                            <span className="text-[#212B36] font-medium">Thanh toán</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-[#ee1314] bg-[#FFF4F4] w-10 h-10 rounded-lg flex items-center justify-center border border-[#FFEBEE] shadow-sm">
                                <i className="fa-solid fa-file-invoice-dollar text-[20px]"></i>
                            </div>
                            <div>
                                <h1 className="text-[20px] lg:text-[22px] font-bold text-[#212B36] leading-tight">Thanh toán đơn hàng</h1>
                                <p className="text-[#637381] text-[13px]">Xác nhận thông tin và chốt đơn</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 pb-6 flex flex-col">
                <div className="flex flex-col lg:flex-row gap-5 flex-1 items-start">
                    
                    {/* Left Content */}
                    <div className="flex-1 w-full bg-white rounded-[20px] shadow-md border border-[#E5E8EB] flex flex-col overflow-hidden">
                        
                        {/* 1. Danh sách vé */}
                        <div className="p-5 border-b border-[#E5E8EB]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">1</div>
                                <h2 className="text-[16px] font-bold text-[#212B36]">Danh sách vé</h2>
                            </div>
                            
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-[#E5E8EB] rounded-xl hover:border-gray-300 transition-colors bg-gray-50/50">
                                        
                                        <div className="w-[120px] sm:w-[180px] h-[100px] rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-gray-100 bg-white p-2">
                                            <img src="https://i.imgur.com/V4b7V3x.jpeg" alt="Vé số" className="w-full h-full object-cover rounded" />
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                                            <div>
                                                <h3 className="font-bold text-[#212B36] text-[15px] mb-1">Xổ số {item.province}</h3>
                                                <div className="text-[13px] text-[#637381] space-y-1 mt-2 bg-white p-2 rounded border border-[#E5E8EB]">
                                                    <p className="flex items-center gap-2"><i className="fa-regular fa-calendar w-4 text-[#ee1314] text-center"></i> <span>Mở thưởng: <strong>{item.date}</strong></span></p>
                                                    <p className="flex items-center gap-2"><i className="fa-regular fa-clock w-4 text-[#ee1314] text-center"></i> <span>Giờ chốt: <strong>{item.time}</strong></span></p>
                                                    <p className="flex items-center gap-2"><i className="fa-solid fa-ticket w-4 text-[#ee1314] text-center"></i> <span>Ký hiệu: <strong>{item.kyHieu}</strong></span></p>
                                                </div>
                                                <div className="mt-3 flex items-center gap-2 bg-[#FFF4F4] rounded px-3 py-1.5 w-max border border-[#FFEBEE]">
                                                    <span className="text-[12px] text-[#637381]">Mã vé:</span>
                                                    <span className="text-[16px] font-bold text-[#ee1314] tracking-widest">{item.numbers}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2 justify-center border-t md:border-t-0 md:border-l border-dashed border-[#E5E8EB] pt-3 md:pt-0 md:pl-5">
                                                <span className="text-[12px] text-[#637381] font-medium">Số lượng / Giá vé</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center border border-[#E5E8EB] rounded-lg bg-white h-8 overflow-hidden">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50 transition-colors"><Minus size={14}/></button>
                                                        <span className="w-8 text-center text-[14px] font-bold border-x border-[#E5E8EB] flex items-center justify-center text-[#212B36]">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50 transition-colors"><Plus size={14}/></button>
                                                    </div>
                                                    <button onClick={() => removeItem(item.id)} className="w-8 h-8 flex items-center justify-center text-[#637381] hover:text-[#ee1314] hover:bg-[#FFF4F4] rounded-lg transition-colors border border-transparent hover:border-[#FFEBEE]">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                                <div className="text-[18px] font-black text-[#ee1314] mt-2 leading-none">
                                                    {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Hình thức nhận vé */}
                        <div className="p-5 border-b border-[#E5E8EB]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">2</div>
                                <h2 className="text-[16px] font-bold text-[#212B36]">Hình thức nhận vé</h2>
                            </div>
                            <div className="w-full">
                                <label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors border-[#ee1314] bg-[#FFF4F4] shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#ee1314] rounded-full -translate-y-1/2 translate-x-1/3 opacity-5 pointer-events-none"></div>
                                    <div className="text-[#ee1314] mt-1">
                                        <CheckCircle2 size={24} className="fill-[#ee1314] text-white shadow-sm rounded-full" />
                                    </div>
                                    <div className="flex-1 z-10 relative">
                                        <div className="flex items-center gap-2 font-bold text-[#212B36] mb-1">
                                            <Store size={18} className="text-[#ee1314]" /> Nhận tại cửa hàng
                                        </div>
                                        <p className="text-[13px] text-[#637381] mt-1 leading-relaxed">
                                            Quý khách vui lòng đến trực tiếp quầy giao dịch Đại Phát để nhận vé giấy thực tế sau khi đặt hàng.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* 3. Phương thức thanh toán */}
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">3</div>
                                <h2 className="text-[16px] font-bold text-[#212B36]">Phương thức thanh toán</h2>
                            </div>
                            <div className="w-full">
                                <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'transfer' ? 'border-[#ee1314] bg-[#FFF4F4] shadow-sm' : 'border-[#E5E8EB] bg-white hover:border-gray-300'}`}>
                                    <div className="text-[#ee1314] mt-1">
                                        <CheckCircle2 size={24} className="fill-[#ee1314] text-white shadow-sm rounded-full" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 font-bold text-[#212B36] mb-1">
                                            <CreditCard size={18} className="text-[#1877F2]" /> Chuyển khoản (Mã QR)
                                        </div>
                                        <p className="text-[13px] text-[#637381] mt-1">Quét mã QR Code bằng ứng dụng ngân hàng hoặc ví điện tử (hỗ trợ 24/7).</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-5">
                        
                        <div className="bg-white rounded-[20px] shadow-md border border-[#E5E8EB] flex flex-col flex-1 overflow-hidden sticky top-24">
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center gap-3 mb-5 shrink-0">
                                    <div className="bg-[#ee1314] text-white w-6 h-6 rounded flex items-center justify-center text-[12px]">
                                        <i className="fa-solid fa-receipt"></i>
                                    </div>
                                    <h3 className="text-[16px] font-bold text-[#212B36]">Đơn hàng của bạn</h3>
                                </div>
                                
                                <div className="space-y-3 mb-5 text-[14px]">
                                    <div className="flex justify-between items-center text-[#637381]">
                                        <span>Tổng số lượng</span>
                                        <span className="font-bold text-[#212B36]">{totalTickets} vé</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[#637381]">
                                        <span>Tạm tính</span>
                                        <span className="font-medium text-[#212B36]">{subTotal.toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[#637381]">
                                        <span>Phí dịch vụ</span>
                                        <span className="font-medium text-[#00A76F]">Miễn phí</span>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-[#E5E8EB] -mx-5 mb-5"></div>

                                <div className="bg-[#FFF4F4] border border-[#FFEBEE] rounded-xl p-4 flex gap-3 mb-2 shadow-sm">
                                    <ShieldCheck className="text-[#ee1314] shrink-0" size={24} strokeWidth={1.5} />
                                    <div>
                                        <div className="font-bold text-[13px] text-[#212B36]">Giao dịch bảo mật 100%</div>
                                        <div className="text-[12px] text-[#637381] mt-0.5 leading-tight">Mọi thông tin thanh toán của bạn luôn được mã hóa an toàn</div>
                                    </div>
                                </div>
                            </div>

                            {/* Total & Action Bottom */}
                            <div className="bg-[#FFF4F4] px-5 py-5 flex flex-col gap-4 mt-auto border-t border-[#FFEBEE]">
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] font-bold text-[#212B36]">Tổng thanh toán</span>
                                    <span className="text-[26px] font-black text-[#ee1314] leading-none">{totalAmount.toLocaleString('vi-VN')} đ</span>
                                </div>

                                <div className="flex flex-col gap-3 mt-2">
                                    <button 
                                        onClick={handleCheckout}
                                        disabled={items.length === 0}
                                        className="w-full py-3.5 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] hover:bg-[#d00f10] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#ee1314]/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
                                    >
                                        <i className="fa-solid fa-check-circle"></i> Chốt đơn ngay
                                    </button>
                                    <button 
                                        onClick={() => navigate('/cart')}
                                        className="w-full py-3 bg-white text-[#637381] font-bold rounded-xl border border-[#E5E8EB] text-[14px] hover:bg-gray-50 hover:text-[#212B36] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={16} /> Về giỏ hàng
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};
