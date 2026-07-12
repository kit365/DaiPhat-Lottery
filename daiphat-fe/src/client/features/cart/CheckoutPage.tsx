import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { Trash2, ChevronRight, Minus, Plus, ShieldCheck, ArrowLeft, Store, CreditCard, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import { AppToast as toast } from '../../../utils/toast.util';
import dayjs from 'dayjs';
import { CheckoutDateTimePicker } from './components/CheckoutDateTimePicker';
import { CreateOnlineOrderRequest, OrderReceiveType } from '../../../types/order.type';
import { PaymentGateway, TransactionType } from '../../../types/transaction.type';
import { useCreateOnlineOrder, useGetOrderReceiveTypes } from '../../hooks/useOrder';
import { useProcessPayment, useGetTransactionTypes } from '../../hooks/useTransaction';
import OrderSummary from './components/OrderSummary';
import { apiApp } from '../../../api';

export const CheckoutPage = () => {
    const navigate = useNavigate();
    const { items, updateQuantity, removeItem, clearCart } = useCartStore();
    const { token, openLoginModal } = useAuthStore();
    const { user } = useAuth();
    
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [expectedPickupAt, setExpectedPickupAt] = useState<string>(() => {
        const now = dayjs();
        const remainder = 15 - (now.minute() % 15);
        // Default to current time + ~30-45 mins so they have buffer to checkout
        return now.add(remainder + 30, 'minute').startOf('minute').toISOString();
    });
    const [note, setNote] = useState('');
    const [email, setEmail] = useState('');
    const [receiveType, setReceiveType] = useState<string>('');
    const [transactionType, setTransactionType] = useState<string>('');

    const createOrderMutation = useCreateOnlineOrder();
    const processPaymentMutation = useProcessPayment();
    const { data: receiveTypesRes } = useGetOrderReceiveTypes();
    const { data: transactionTypesRes } = useGetTransactionTypes();

    const receiveTypes = receiveTypesRes?.data || [];
    const transactionTypes = transactionTypesRes?.data || [];

    React.useEffect(() => {
        if (receiveTypes.length > 0 && !receiveType) {
            setReceiveType(receiveTypes[0].value);
        }
    }, [receiveTypes, receiveType]);

    React.useEffect(() => {
        if (transactionTypes.length > 0 && !transactionType) {
            const onlineType = transactionTypes.find(t => t.value === TransactionType.ONLINE);
            setTransactionType(onlineType ? onlineType.value : transactionTypes[0].value);
        }
    }, [transactionTypes, transactionType]);

    React.useEffect(() => {
        if (user) {
            if (!name) setName(user.fullName || user.username || '');
            if (!phone) setPhone(user.phoneNumber || user.phone || '');
            if (!email) setEmail(user.email || '');
        }
    }, [user]);

    React.useEffect(() => {
        if (!token) {
            toast.error("Vui lòng đăng nhập để tiếp tục thanh toán");
            openLoginModal();
            navigate('/cart', { replace: true });
        }
    }, [token, navigate, openLoginModal]);

    React.useEffect(() => {
        const validateCartStock = async () => {
            if (items.length === 0) return;
            
            try {
                let hasError = false;
                for (const item of items) {
                    const response = await apiApp.get(`/lottery-tickets/${item.id}`);
                    const ticketData = response.data?.data;
                    
                    if (ticketData) {
                        const maxStock = ticketData.quantity || 0;
                        if (item.quantity > maxStock) {
                            if (maxStock === 0) {
                                toast.error(`Vé số ${item.numbers} đã hết hàng. Vui lòng chọn vé khác.`);
                                removeItem(item.id);
                            } else {
                                toast.error(`Vé số ${item.numbers} chỉ còn ${maxStock} vé. Hệ thống đã tự cập nhật lại giỏ hàng.`);
                                updateQuantity(item.id, maxStock - item.quantity); // updateQuantity takes delta
                            }
                            hasError = true;
                        }
                    }
                }
                
                if (hasError) {
                    navigate('/cart', { replace: true });
                }
            } catch (error) {
                console.error("Lỗi kiểm tra tồn kho:", error);
            }
        };

        validateCartStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0);
    const subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 0; // No delivery fee since it's pickup only
    const totalAmount = subTotal + deliveryFee;

    const handleCheckout = () => {
        if (!name || !phone || !expectedPickupAt) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc (Tên, SĐT, Giờ đến lấy)!");
            return;
        }

        const expectedDateObj = new Date(expectedPickupAt);

        // Phải cách ít nhất 15 phút để cửa hàng chuẩn bị
        if (dayjs(expectedDateObj).isBefore(dayjs().add(15, 'minute'))) {
            toast.error("Vui lòng chọn thời gian đến lấy sau ít nhất 15 phút để cửa hàng chuẩn bị vé!");
            return;
        }

        const payload: CreateOnlineOrderRequest = {
            name,
            phone,
            items: items.map(item => ({
                lotteryTicketId: Number(item.id),
                quantity: item.quantity
            })),
            receiveType: receiveType as OrderReceiveType,
            expectedPickupAt: dayjs(expectedDateObj).format('YYYY-MM-DDTHH:mm:ss'),
            note: note || undefined
        };

        createOrderMutation.mutate(payload, {
            onSuccess: (res) => {
                if (res.success && res.data) {
                    const orderId = res.data.id;
                    const transactionId = res.data.transactions?.[0]?.id;

                    if (transactionType === TransactionType.ONLINE && transactionId) {
                        // Redirect to PayOS
                        processPaymentMutation.mutate({
                            orderId,
                            data: {
                                transactionId,
                                gateway: PaymentGateway.PAYOS
                            }
                        }, {
                            onSuccess: (paymentRes) => {
                                if (paymentRes.success && paymentRes.data?.checkoutUrl) {
                                    clearCart();
                                    window.location.href = paymentRes.data.checkoutUrl;
                                } else {
                                    toast.error("Không lấy được đường dẫn thanh toán");
                                }
                            }
                        });
                    } else {
                        // For cash or if no transaction id
                        toast.success("Đặt hàng thành công!");
                        clearCart();
                        navigate('/'); // Navigate to success page
                    }
                }
            }
        });
    };

    const isSubmitting = createOrderMutation.isPending || processPaymentMutation.isPending;

    return (
        <div 
            className="client-page min-h-screen flex flex-col bg-fixed bg-cover bg-center pb-20"
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
                            <div>
                                <h1 className="client-heading mb-1 tracking-tight">Thanh toán đơn hàng</h1>
                                <p className="client-body">Xác nhận thông tin và chốt đơn</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 pb-6 flex flex-col">
                <div className="flex flex-col lg:flex-row gap-5 flex-1 items-start">
                    
                    {/* Left Content */}
                    <div className="flex-1 w-full bg-white rounded-[20px] shadow-md border border-[#E5E8EB] flex flex-col">
                        
                        {/* 1. Danh sách vé */}
                        <div className="p-5 border-b border-[#E5E8EB]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">1</div>
                                <h2 className="client-section-heading text-[#212B36]">Danh sách vé</h2>
                            </div>
                            
                            {/* Table Column Headers (Desktop only) */}
                            <div className="hidden lg:grid grid-cols-[1.5fr_1.5fr_100px_100px_100px_80px] gap-4 mb-4 mt-2 text-[13px] font-bold text-[#212B36] uppercase items-center border-b border-[#E5E8EB] pb-3">
                                <div className="text-left">Vé số</div>
                                <div className="text-left">Đài & Ngày quay</div>
                                <div className="text-center">Số lượng</div>
                                <div className="text-center">Đơn giá</div>
                                <div className="text-center">Thành tiền</div>
                                <div className="text-center">Thao tác</div>
                            </div>

                            <div className="flex flex-col">
                                {items.map((item) => (
                                    <div key={item.id} className="flex flex-col lg:grid lg:grid-cols-[1.5fr_1.5fr_100px_100px_100px_80px] gap-4 items-center py-4 border-b border-dashed border-[#E5E8EB] last:border-b-0">
                                        
                                        {/* Vé số */}
                                        <div className="flex items-center gap-3">
                                            <img src={item.ticketImg || 'https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png'} alt="Vé" className="w-[80px] h-[50px] object-cover mix-blend-multiply border border-gray-100 rounded shrink-0" />
                                            <div className="font-bold text-[16px] text-[#212B36] tracking-tight">{item.numbers}</div>
                                        </div>

                                        {/* Đài & Ngày quay */}
                                        <div className="flex flex-col items-start gap-1">
                                            <div className="flex items-center gap-2">
                                                <img src={item.provinceIcon || 'https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png'} alt="Logo" className="w-5 h-5 rounded-full border border-gray-200" />
                                                <span className="font-bold text-[13px] text-[#212B36]">{item.province}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[12px] text-[#637381] pl-7">
                                                <span className="font-medium text-[#212B36]">{item.date}</span>
                                                <span>•</span>
                                                <span>{item.time}</span>
                                            </div>
                                        </div>

                                        {/* Số lượng */}
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center border border-[#E5E8EB] rounded bg-white h-7 w-[80px] overflow-hidden">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="flex-1 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50"><Minus size={12} /></button>
                                                <span className="w-7 h-full flex items-center justify-center text-[13px] font-bold text-[#212B36] border-x border-[#E5E8EB]">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="flex-1 h-full flex items-center justify-center text-[#637381] hover:bg-gray-50"><Plus size={12} /></button>
                                            </div>
                                        </div>

                                        {/* Đơn giá */}
                                        <div className="text-center text-[13px] text-[#637381]">
                                            {(item.price).toLocaleString('vi-VN')}đ
                                        </div>

                                        {/* Thành tiền */}
                                        <div className="text-center text-[14px] font-bold text-[#ee1314]">
                                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                        </div>

                                        {/* Thao tác */}
                                        <div className="flex justify-center">
                                            <button onClick={() => removeItem(item.id)} className="text-[#ee1314] hover:text-[#d00f10] transition-colors w-8 h-8 rounded-full hover:bg-[#FFF4F4] flex items-center justify-center">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Thông tin khách hàng & Hình thức nhận vé */}
                        <div className="p-5 border-b border-[#E5E8EB]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">2</div>
                                <h2 className="client-section-heading text-[#212B36]">Thông tin nhận vé</h2>
                            </div>
                            
                            {/* Form thông tin khách hàng */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-[13px] font-medium text-[#212B36] mb-1.5">Họ và tên <span className="text-[#ee1314]">*</span></label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-11 px-3 py-2 border border-[#E5E8EB] rounded-lg text-[14px] focus:outline-none focus:border-[#ee1314] transition-colors"
                                        placeholder="Nhập họ và tên"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-[#212B36] mb-1.5">Số điện thoại <span className="text-[#ee1314]">*</span></label>
                                    <input 
                                        type="tel" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full h-11 px-3 py-2 border border-[#E5E8EB] rounded-lg text-[14px] focus:outline-none focus:border-[#ee1314] transition-colors"
                                        placeholder="Nhập số điện thoại"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-[#212B36] mb-1.5">Email</label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        disabled
                                        className="w-full h-11 px-3 py-2 border border-[#E5E8EB] bg-gray-50 rounded-lg text-[14px] text-[#637381] cursor-not-allowed focus:outline-none transition-colors"
                                        placeholder="Email tài khoản"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-[#212B36] mb-1.5">Thời gian đến lấy (dự kiến) <span className="text-[#ee1314]">*</span></label>
                                    <CheckoutDateTimePicker 
                                        value={expectedPickupAt}
                                        onChange={(val) => setExpectedPickupAt(val)}
                                        minDate={new Date()}
                                        maxDate={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-[#212B36] mb-1.5">Ghi chú thêm</label>
                                    <input 
                                        type="text" 
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full h-11 px-3 py-2 border border-[#E5E8EB] rounded-lg text-[14px] focus:outline-none focus:border-[#ee1314] transition-colors"
                                        placeholder="VD: Tới lấy vào giờ nghỉ trưa..."
                                    />
                                </div>
                            </div>

                            <div className="w-full space-y-3">
                                {receiveTypes.map(type => (
                                    <label key={type.value} className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${receiveType === type.value ? 'border-[#ee1314] bg-[#FFF4F4] shadow-sm' : 'border-[#E5E8EB] bg-white hover:border-gray-300'} relative overflow-hidden`}>
                                        {receiveType === type.value && <div className="absolute top-0 right-0 w-24 h-24 bg-[#ee1314] rounded-full -translate-y-1/2 translate-x-1/3 opacity-5 pointer-events-none"></div>}
                                        <div className={`mt-1 ${receiveType === type.value ? 'text-[#ee1314]' : 'text-gray-300'}`}>
                                            <CheckCircle2 size={24} className={receiveType === type.value ? 'fill-[#ee1314] text-white shadow-sm rounded-full' : 'stroke-2'} />
                                        </div>
                                        <div className="flex-1 z-10 relative">
                                            <div className="flex items-center gap-2 font-bold text-[#212B36] mb-1">
                                                <Store size={18} className={receiveType === type.value ? 'text-[#ee1314]' : 'text-gray-400'} /> {type.label}
                                            </div>
                                            {type.value === OrderReceiveType.COUNTER_PICKUP && (
                                                <p className="text-[13px] text-[#637381] mt-1 leading-relaxed">
                                                    Quý khách vui lòng đến trực tiếp quầy giao dịch Đại Phát để nhận vé giấy thực tế sau khi đặt hàng.
                                                </p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 3. Phương thức thanh toán */}
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-6 h-6 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-[13px] font-bold">3</div>
                                <h2 className="client-section-heading text-[#212B36]">Phương thức thanh toán</h2>
                            </div>
                            <div className="w-full space-y-3">
                                {transactionTypes
                                    .filter(type => type.value === TransactionType.ONLINE)
                                    .map(type => (
                                    <label key={type.value} onClick={() => setTransactionType(type.value)} className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${transactionType === type.value ? 'border-[#ee1314] bg-[#FFF4F4] shadow-sm' : 'border-[#E5E8EB] bg-white hover:border-gray-300'}`}>
                                        <div className={`mt-1 ${transactionType === type.value ? 'text-[#ee1314]' : 'text-gray-300'}`}>
                                            <CheckCircle2 size={24} className={transactionType === type.value ? 'fill-[#ee1314] text-white shadow-sm rounded-full' : 'stroke-2'} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 font-bold text-[#212B36] mb-1">
                                                <CreditCard size={18} className={transactionType === type.value ? 'text-[#1877F2]' : 'text-gray-400'} /> {type.label}
                                            </div>
                                            {type.value === TransactionType.ONLINE && (
                                                <p className="text-[13px] text-[#637381] mt-1">Quét mã QR Code bằng ứng dụng ngân hàng (hỗ trợ 24/7).</p>
                                            )}
                                            {type.value === TransactionType.OFFLINE && (
                                                <p className="text-[13px] text-[#637381] mt-1">Thanh toán bằng tiền mặt khi nhận vé tại quầy.</p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-5">
                        
                        <OrderSummary 
                            totalTickets={totalTickets}
                            totalAmount={subTotal}
                            actions={
                                <>
                                    <button 
                                        onClick={handleCheckout}
                                        disabled={items.length === 0 || isSubmitting}
                                        className="w-full py-3.5 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] hover:bg-[#d00f10] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#ee1314]/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
                                    >
                                        {isSubmitting ? (
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                        ) : (
                                            <i className="fa-solid fa-check-circle"></i>
                                        )}
                                        {isSubmitting ? 'Đang xử lý...' : 'Chốt đơn ngay'}
                                    </button>
                                    <button 
                                        onClick={() => navigate('/cart')}
                                        className="w-full py-3 bg-white text-[#637381] font-bold rounded-xl border border-[#E5E8EB] text-[14px] hover:bg-gray-50 hover:text-[#212B36] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={16} /> Về giỏ hàng
                                    </button>
                                </>
                            }
                        />

                    </div>
                </div>
            </main>
        </div>
    );
};
