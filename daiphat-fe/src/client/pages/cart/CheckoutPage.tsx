import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { Trash2, ChevronRight, Minus, Plus, ShieldCheck, ArrowLeft, MapPin, CreditCard, Store, Truck } from 'lucide-react';

const MOCK_CHECKOUT_ITEMS = [
    {
        id: "1",
        province: "Kiên Giang",
        date: "Chủ nhật, 09/02/2025",
        time: "16:10",
        kyHieu: "2K2",
        numbers: "853913",
        price: 10000,
        quantity: 1,
        color: "#f59e0b"
    },
    {
        id: "2",
        province: "TP. Hồ Chí Minh",
        date: "Thứ hai, 10/02/2025",
        time: "16:15",
        kyHieu: "2D2",
        numbers: "123456",
        price: 10000,
        quantity: 1,
        color: "#ec4899"
    }
];

export const CheckoutPage = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState(MOCK_CHECKOUT_ITEMS);
    const [deliveryMethod, setDeliveryMethod] = useState<'store' | 'delivery'>('store');
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bank'>('wallet');

    const updateQuantity = (id: string, delta: number) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQ = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQ };
            }
            return item;
        }));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0);
    const subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = deliveryMethod === 'delivery' ? 15000 : 0;
    const totalAmount = subTotal + deliveryFee;

    const handleCheckout = () => {
        // Mock checkout API call
        navigate('/profile/tickets'); // Navigate to purchased tickets page or success page
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif] pb-20">
            <Header />
            
            <main className="max-w-[1200px] mx-auto px-4 pt-28">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-[14px] text-[#637381] mb-6">
                    <Link to="/" className="hover:text-[#BA0000] transition-colors">Trang chủ</Link>
                    <ChevronRight size={14} />
                    <Link to="/cart" className="hover:text-[#BA0000] transition-colors">Giỏ hàng</Link>
                    <ChevronRight size={14} />
                    <span className="text-[#212B36] font-medium">Thanh toán</span>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="text-[#BA0000] bg-[#FFF4F4] w-12 h-12 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-file-invoice-dollar text-[24px]"></i>
                    </div>
                    <div>
                        <h1 className="text-[24px] font-bold text-[#212B36]">Thanh toán đơn hàng</h1>
                        <p className="text-[#637381] text-[14px]">Xác nhận thông tin và hoàn tất thanh toán</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Content */}
                    <div className="flex-1 w-full flex flex-col gap-8">
                        
                        {/* 1. Danh sách vé */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <h2 className="text-[18px] font-bold text-[#212B36] mb-4">1. Danh sách vé</h2>
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 border border-[#E5E8EB] rounded-lg relative">
                                        
                                        <div className="w-[280px] h-[130px] rounded flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-gray-100">
                                            <img src="https://i.imgur.com/V4b7V3x.jpeg" alt="Vé số" className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                                            <div>
                                                <h3 className="font-bold text-[#212B36] text-[16px] mb-2">Xổ số {item.province} {item.kyHieu}</h3>
                                                <div className="text-[13px] text-[#637381] space-y-1">
                                                    <p><i className="fa-regular fa-calendar w-4 text-center"></i> Ngày mở thưởng: {item.date}</p>
                                                    <p><i className="fa-regular fa-clock w-4 text-center"></i> Giờ mở thưởng: {item.time}</p>
                                                    <p><i className="fa-solid fa-ticket w-4 text-center"></i> Ký hiệu: {item.kyHieu}</p>
                                                    <p><i className="fa-solid fa-location-dot w-4 text-center"></i> Khu vực: {item.province}</p>
                                                    <p><i className="fa-solid fa-print w-4 text-center"></i> Hình thức: Vé số truyền thống</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2 justify-center">
                                                <span className="text-[13px] text-[#637381] font-medium">Số lượng</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center border border-[#E5E8EB] rounded bg-white">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-[#637381] hover:bg-gray-50"><Minus size={14}/></button>
                                                        <span className="w-8 text-center text-[14px] font-medium">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-[#637381] hover:bg-gray-50"><Plus size={14}/></button>
                                                    </div>
                                                    <button onClick={() => removeItem(item.id)} className="w-8 h-8 flex items-center justify-center text-[#BA0000] bg-[#FFF4F4] rounded hover:bg-[#ffe4e4] transition-colors">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                                <div className="text-[16px] font-bold text-[#BA0000] mt-2">
                                                    {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Hình thức nhận vé */}
                        <div>
                            <h2 className="text-[18px] font-bold text-[#212B36] mb-4">2. Hình thức nhận vé</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${deliveryMethod === 'store' ? 'border-[#BA0000] bg-[#FFF8F8]' : 'border-[#E5E8EB] bg-white hover:border-gray-300'}`}>
                                    <input 
                                        type="radio" 
                                        name="deliveryMethod" 
                                        checked={deliveryMethod === 'store'}
                                        onChange={() => setDeliveryMethod('store')}
                                        className="mt-1 w-4 h-4 accent-[#BA0000]" 
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 font-bold text-[#212B36] mb-1">
                                            <Store size={18} className="text-[#BA0000]" /> Đến lấy tại cửa hàng
                                        </div>
                                        <p className="text-[13px] text-[#637381]">Nhận vé trực tiếp tại cửa hàng Đại Phát</p>
                                    </div>
                                </label>
                                <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${deliveryMethod === 'delivery' ? 'border-[#BA0000] bg-[#FFF8F8]' : 'border-[#E5E8EB] bg-white hover:border-gray-300'}`}>
                                    <input 
                                        type="radio" 
                                        name="deliveryMethod" 
                                        checked={deliveryMethod === 'delivery'}
                                        onChange={() => setDeliveryMethod('delivery')}
                                        className="mt-1 w-4 h-4 accent-[#BA0000]" 
                                    />
                                    <div className="flex-1 flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 font-bold text-[#212B36] mb-1">
                                                <Truck size={18} className="text-[#BA0000]" /> Giao tận nơi
                                            </div>
                                            <p className="text-[13px] text-[#637381]">Nhận vé giấy tận tay</p>
                                        </div>
                                        <span className="font-bold text-[#BA0000]">15.000 đ</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* 3. Phương thức thanh toán */}
                        <div>
                            <h2 className="text-[18px] font-bold text-[#212B36] mb-4">3. Phương thức thanh toán</h2>
                            <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'wallet' ? 'border-[#BA0000] bg-[#FFF8F8]' : 'border-[#E5E8EB] bg-white hover:border-gray-300'}`}>
                                <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    checked={paymentMethod === 'wallet'}
                                    onChange={() => setPaymentMethod('wallet')}
                                    className="mt-1 w-4 h-4 accent-[#BA0000]" 
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 font-bold text-[#212B36] mb-1">
                                        <i className="fa-solid fa-wallet text-[#BA0000]"></i> Ví Đại Phát
                                    </div>
                                    <p className="text-[13px] text-[#637381]">Số dư hiện tại: <span className="font-bold text-[#00A76F]">1.250.000 đ</span></p>
                                </div>
                            </label>
                        </div>

                        <div className="bg-[#F8F9FA] border border-[#E5E8EB] rounded-lg p-4 flex items-center gap-3 text-[14px] text-[#637381]">
                            <ShieldCheck size={20} className="text-[#BA0000]" />
                            <span>Thanh toán an toàn và bảo mật. Thông tin của bạn luôn được bảo vệ.</span>
                        </div>
                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-6">
                        
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <h3 className="text-[18px] font-bold text-[#212B36] mb-6">Thông tin đơn hàng</h3>
                            
                            <div className="space-y-4 mb-6 text-[14px]">
                                <div className="flex justify-between text-[#637381]">
                                    <span>Tạm tính ({totalTickets} vé)</span>
                                    <span className="text-[#212B36] font-medium">{subTotal.toLocaleString('vi-VN')} đ</span>
                                </div>
                                <div className="flex justify-between text-[#637381]">
                                    <span>Phí giao vé</span>
                                    <span className="text-[#212B36] font-medium">{deliveryFee.toLocaleString('vi-VN')} đ</span>
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
                                    onClick={handleCheckout}
                                    disabled={items.length === 0}
                                    className="w-full py-3.5 bg-[#BA0000] text-white font-bold rounded-lg hover:bg-[#990000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-lock"></i> Xác nhận thanh toán
                                </button>
                                <button 
                                    onClick={() => navigate('/cart')}
                                    className="w-full py-3.5 bg-white text-[#212B36] font-semibold rounded-lg border border-[#E5E8EB] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={18} /> Quay lại giỏ hàng
                                </button>
                            </div>
                        </div>

                        {/* Support Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6">
                            <h3 className="text-[16px] font-bold text-[#212B36] mb-4">Bạn cần hỗ trợ?</h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><i className="fa-solid fa-phone-volume text-[#BA0000]"></i></div>
                                    <div>
                                        <div className="font-bold text-[#212B36] text-[14px]">1900 633 325</div>
                                        <div className="text-[12px] text-[#637381]">(08:00 - 22:00 mỗi ngày)</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><i className="fa-regular fa-envelope text-[#BA0000]"></i></div>
                                    <div>
                                        <div className="font-bold text-[#212B36] text-[14px]">hotro@daiphat.vn</div>
                                        <div className="text-[12px] text-[#637381]">Phản hồi trong 15 phút</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1"><i className="fa-regular fa-comment-dots text-[#BA0000]"></i></div>
                                    <div>
                                        <div className="font-bold text-[#212B36] text-[14px]">Chat với Đại Phát</div>
                                        <div className="text-[12px] text-[#637381]">Hỗ trợ nhanh chóng</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 text-[12px] text-[#637381]">
                                <Link to="#" className="hover:text-[#BA0000]">Chính sách bảo mật</Link>
                                <span>|</span>
                                <Link to="#" className="hover:text-[#BA0000]">Điều khoản sử dụng</Link>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};
