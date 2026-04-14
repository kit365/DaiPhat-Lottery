import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getMyBooking, updateBooking, createBooking, getBookingConfig } from "../../api/booking.api";
import { ProductBanner } from "../product/sections/ProductBanner";
import { FooterSub } from "../../components/layouts/FooterSub";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    User,
    LogOut,
    Calendar,
    Clock,
    PawPrint,
    Loader2
} from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useBookingStore } from "../../../stores/useBookingStore";

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Dịch vụ", to: "/services" },
    { label: "Thanh toán đặt lịch", to: "#" },
];

export const ServiceCheckoutPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const {
        service: storeService,
        selectedPets: storePets,
        startTime: storeStartTime,
        endTime: storeEndTime,
        totalDuration: storeDuration,
        note: storeNote,
        resetBooking
    } = useBookingStore();
    const [booking, setBooking] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<string>("money");
    const [depositGateway, setDepositGateway] = useState<string>("vnpay");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [depositPercentage, setDepositPercentage] = useState(0);
    const [refundCancellationHours, setRefundCancellationHours] = useState(0);

    const [notes, setNotes] = useState("");
    const [totalDuration, setTotalDuration] = useState<number>(0);

    useEffect(() => {
        if (id && id !== "new") {
            getMyBooking(id)
                .then(res => {
                    if (res.code === 200) {
                        setBooking(res.data);
                        setNotes(res.data.notes || "");
                        if (res.data.notes) setShowNotes(true);

                        // Đối với đơn hàng đã có, tính toán thời lượng thực tế/dự kiến
                        const start = dayjs(res.data.startTime || res.data.start);
                        const end = dayjs(res.data.endTime || res.data.end);
                        setTotalDuration(end.diff(start, 'minute'));
                    } else {
                        toast.error("Không tìm thấy thông tin lịch đặt!");
                        navigate("/services");
                    }
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Lỗi khi tải thông tin lịch đặt");
                    navigate("/services");
                })
                .finally(() => setIsLoading(false));
        } else if (id === "new" && !booking) {
            if (storeService && storePets.length > 0) {
                // Lấy tổng thời lượng dự kiến từ store
                setTotalDuration(storeDuration || 0);

                // Tính toán các khoản phí dựa trên dữ liệu từ store
                let subTotal = 0;
                storePets.forEach((pet: any) => {
                    if (storeService.pricingType === 'fixed') {
                        subTotal += storeService.basePrice || 0;
                    } else if (storeService.pricingType === 'by-weight') {
                        const weight = pet.weight || 0;
                        const priceItem = storeService.priceList?.find((item: any) => {
                            const label = item.label;
                            if (!label) return false;
                            if (label.includes('<')) return weight < parseFloat(label.replace(/[^\d.]/g, ''));
                            if (label.includes('>')) return weight > parseFloat(label.replace(/[^\d.]/g, ''));
                            if (label.includes('-')) {
                                const nums = label.match(/\d+\.?\d*/g);
                                return nums && weight >= parseFloat(nums[0]) && weight <= parseFloat(nums[1]);
                            }
                            return weight <= parseFloat(label.replace(/[^\d.]/g, ''));
                        });
                        subTotal += priceItem ? priceItem.value : (storeService.basePrice || 0);
                    }
                });

                if (storeNote) {
                    setNotes(storeNote);
                    setShowNotes(true);
                }

                setBooking({
                    serviceId: storeService,
                    petIds: storePets,
                    start: storeStartTime,
                    end: storeEndTime,
                    customerName: user?.fullName,
                    customerPhone: user?.phone,
                    subTotal: subTotal,
                    total: subTotal,
                    discount: 0
                });
                setIsLoading(false);
            } else {
                toast.error("Thiếu thông tin đặt lịch!");
                navigate("/services");
            }
        }

        // Lấy cấu hình đặt lịch
        getBookingConfig().then(res => {
            if (res.code === 200) {
                setDepositPercentage(res.data.depositPercentage || 0);
                setRefundCancellationHours(res.data.refundCancellationHours || 0);
            }
        });
    }, [id, navigate, user, storeService, storePets, storeStartTime, storeEndTime, storeDuration, storeNote]);

    const handlePayment = async () => {
        if (!booking) return;
        setIsProcessing(true);

        try {
            let bookingCode = booking.code;

            if (id === "new") {
                const bookingData = {
                    serviceId: booking.serviceId?._id,
                    petIds: booking.petIds?.map((p: any) => p._id),
                    startTime: booking.start,
                    notes: showNotes ? notes : "",
                    paymentMethod: paymentMethod
                };

                const response = await createBooking(bookingData);
                if (response.code === 200 || response.code === 201) {
                    bookingCode = response.data.code;
                } else {
                    toast.error(response.message || "Không thể khởi tạo đơn hàng!");
                    setIsProcessing(false);
                    return;
                }
            } else if (id) {
                await updateBooking(id, { notes: showNotes ? notes : "" });
            }

            const phone: string = booking.customerPhone || user?.phone || "";
            const isBooking = bookingCode.startsWith("BK");

            const gateway = (paymentMethod === "money" && depositPercentage > 0) ? depositGateway : paymentMethod;

            if (gateway === "zalopay") {
                resetBooking();
                window.location.href = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/client/order/payment-zalopay?${isBooking ? "bookingCode" : "orderCode"}=${bookingCode}&phone=${phone}`;
            } else if (gateway === "vnpay") {
                resetBooking();
                window.location.href = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/client/order/payment-vnpay?${isBooking ? "bookingCode" : "orderCode"}=${bookingCode}&phone=${phone}`;
            } else {
                toast.success("Đặt lịch thành công! DaiPhat đang đợi bé ạ.");
                resetBooking(); // Xóa dữ liệu store sau khi đã đặt lịch thành công
                navigate("/booking/success");
            }
        } catch (error) {
            console.error(error);
            toast.error("Gặp lỗi khi xử lý thông tin, bạn thử lại sau nha!");
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/auth/login");
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
                <Loader2 className="w-10 h-10 text-client-primary animate-spin" />
                <p className="text-gray-500 font-medium font-secondary uppercase tracking-widest text-[13px]">Đang tải thông tin thanh toán...</p>
            </div>
        );
    }

    if (!booking) return null;

    return (
        <>
            <ProductBanner
                pageTitle="Thanh toán"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-listing.jpg"
                className="bg-top"
            />

            <div className="app-container flex pb-[150px] 2xl:pb-[100px] relative">
                {/* Cột trái: Thông tin đặt lịch */}
                <div className="w-[calc(100%-518px)] py-[50px]">
                    {/* Header thông tin người dùng */}
                    <div className="mb-[40px] p-[20px] bg-[#fcfcfc] border border-dashed border-gray-200 rounded-[15px] flex items-center justify-between">
                        <div className="flex items-center gap-[12px] text-[16px] text-client-secondary font-medium">
                            <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm">
                                <User className="w-[20px] h-[20px] text-client-primary" />
                            </div>
                            <span>Tài khoản: <span className="font-bold">{user?.fullName}</span></span>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="px-[15px] py-[8px] rounded-[10px] bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center gap-[8px] text-[13px] font-bold"
                        >
                            <LogOut className="w-[16px] h-[16px]" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>

                    <h2 className="text-[40px] font-secondary mt-[8px] mb-[30px] font-bold">Thông tin dịch vụ</h2>

                    <div className="space-y-[25px]">
                        {/* Thẻ tóm tắt chi tiết */}
                        <div className="bg-white border border-gray-100 rounded-[25px] p-[35px]">
                            <h3 className="text-[18px] font-bold text-client-secondary mb-[25px]">Chi tiết đặt lịch</h3>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Dịch vụ</span>
                                        <span className="text-[16px] font-bold text-client-secondary">
                                            {booking.serviceId?.name}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Thời gian hẹn</span>
                                        <div className="space-y-1 mt-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-client-primary" />
                                                <span className="text-[16px] font-bold text-client-secondary">
                                                    {dayjs(booking.start).format("DD/MM/YYYY")}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-client-primary" />
                                                <span className="text-[16px] font-bold text-client-secondary">
                                                    {dayjs(booking.start).format("HH:mm")} - {dayjs(booking.end).format("HH:mm")}
                                                </span>
                                                <span className="text-[13px] text-client-primary/60 font-medium bg-client-primary/5 px-2 py-0.5 rounded-full">
                                                    ~{totalDuration} phút dự kiến
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Người đặt</span>
                                        <span className="text-[16px] font-bold text-client-secondary">{booking.customerName}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">Số điện thoại</span>
                                        <span className="text-[16px] font-bold text-client-secondary">{booking.customerPhone}</span>
                                    </div>
                                </div>
                            </div>

                            {(booking.serviceId?.procedure || storeService?.procedure) && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-lg bg-client-primary/10 flex items-center justify-center">
                                            <Icon icon="solar:clipboard-list-bold-duotone" width={14} className="text-client-primary" />
                                        </div>
                                        <span className="text-[14px] font-bold text-client-secondary">Quy trình thực hiện cụ thể:</span>
                                    </div>
                                    <div
                                        className="text-[14px] text-gray-500 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200"
                                        dangerouslySetInnerHTML={{ __html: booking.serviceId?.procedure || storeService?.procedure }}
                                    />
                                </div>
                            )}

                            {/* Lưu ý quan trọng & Chính sách hủy */}
                            <div className="mt-8 space-y-4">
                                {refundCancellationHours > 0 && (
                                    <div className="p-5 bg-teal-50/50 border border-teal-100/30 rounded-[20px] flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-teal-100/60 flex items-center justify-center shrink-0">
                                            <Icon icon="solar:info-circle-bold-duotone" width={22} className="text-teal-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-[15px] font-bold text-teal-800">Chính sách hủy & hoàn tiền</h4>
                                            <p className="text-[13.5px] text-teal-700/80 leading-relaxed font-medium">
                                                Hoàn <span className="font-bold text-teal-600">100%</span> nếu hủy trước ít nhất <span className="font-bold text-teal-600">{refundCancellationHours} giờ</span> so với giờ hẹn. Sau thời gian này, DaiPhat xin phép <span className="font-bold text-red-500">không hoàn trả</span> tiền cọc/thanh toán nếu bạn hủy lịch.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="p-5 bg-indigo-50/50 border border-indigo-100/30 rounded-[20px] flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100/60 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:shield-check-bold-duotone" width={22} className="text-indigo-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[15px] font-bold text-indigo-800">Xác nhận tình trạng thú cưng</h4>
                                        <p className="text-[13.5px] text-indigo-700/80 leading-relaxed font-medium">
                                            Vui lòng xác nhận đúng <span className="font-bold">số tuổi</span> của bé pet và đảm bảo bé có <span className="font-bold">tình trạng sức khỏe tốt</span> (đã tiêm phòng, không bệnh truyền nhiễm) trước khi đến DaiPhat nha!
                                        </p>
                                        <p className="text-[12.5px] text-red-500 font-bold italic mt-1">
                                            * Lưu ý: Nếu khi đến thực hiện dịch vụ, thông tin bé không đúng hoặc không đủ điều kiện sức khỏe, DaiPhat sẽ buộc phải hủy đơn và <span className="underline">không hoàn trả</span> tiền cọc/thanh toán.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phần ghi chú */}
                        <div className="mt-[30px] mb-[40px] cursor-pointer">
                            <input
                                type="checkbox"
                                id="bookingNotesCheckbox"
                                checked={showNotes}
                                onChange={() => setShowNotes(!showNotes)}
                                className="hidden"
                            />
                            <label htmlFor="bookingNotesCheckbox" className="text-client-text pl-[0px] text-[16px] font-medium select-none flex items-center gap-[12px]">
                                <div className={`w-[20px] h-[20px] border-2 rounded-[4px] flex items-center justify-center transition-all ${showNotes ? 'bg-client-primary border-client-primary' : 'border-[#ddd]'}`}>
                                    {showNotes && <div className="w-[10px] h-[6px] border-l-2 border-b-2 border-white -rotate-45 mb-[2px]"></div>}
                                </div>
                                Thêm ghi chú lịch đặt
                            </label>

                            <AnimatePresence>
                                {showNotes && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-[20px]">
                                            <textarea
                                                placeholder="Lưu ý đặc biệt cho dịch vụ..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={3}
                                                className="rounded-[20px] border border-[#eee] text-client-secondary py-[14px] px-[28px] w-full outline-none focus:border-client-primary transition-default resize-none bg-white hover:border-gray-300"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="pt-[40px] mt-[40px] border-t border-[#eee]">
                            <Link to="/services" className="flex items-center text-client-secondary font-secondary hover:text-client-primary transition-default group">
                                <ArrowLeft className="text-[18px] mr-[10px] transition-transform group-hover:-translate-x-1" />
                                <span className="text-[16px] font-secondary font-medium">Trở lại dịch vụ</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Cột phải: Sidebar tóm tắt đơn hàng */}
                <div className="w-[468px] ml-[50px] py-[50px] shrink-0">
                    <div className="sticky top-[20px] bg-white rounded-[25px] border border-[#eee] overflow-hidden">
                        <h2 className="py-[20px] px-[30px] text-[20px] font-bold text-client-secondary border-b border-[#eee]">Tóm tắt đơn đặt</h2>

                        <div className="p-[35px]">
                            {/* Danh sách thú cưng tóm tắt */}
                            <ul className="mb-[30px] pr-[10px]">
                                {booking.petIds?.map((pet: any, index: number) => {
                                    let petPrice = 0;
                                    if (booking.serviceId?.pricingType === 'fixed') {
                                        petPrice = booking.serviceId?.basePrice || 0;
                                    } else if (booking.serviceId?.pricingType === 'by-weight') {
                                        const weight = pet.weight || 0;
                                        const priceItem = booking.serviceId?.priceList?.find((item: any) => {
                                            const label = item.label;
                                            if (!label) return false;
                                            if (label.includes('<')) return weight < parseFloat(label.replace(/[^\d.]/g, ''));
                                            if (label.includes('>')) return weight > parseFloat(label.replace(/[^\d.]/g, ''));
                                            if (label.includes('-')) {
                                                const nums = label.match(/\d+\.?\d*/g);
                                                return nums && weight >= parseFloat(nums[0]) && weight <= parseFloat(nums[1]);
                                            }
                                            return weight <= parseFloat(label.replace(/[^\d.]/g, ''));
                                        });
                                        petPrice = priceItem ? priceItem.value : (booking.serviceId?.basePrice || 0);
                                    }

                                    return (
                                        <li key={index} className="flex py-[20px] border-b border-[#f9f9f9] first:pt-0 last:border-0 last:pb-0">
                                            <div className="relative shrink-0">
                                                <div className="w-[65px] h-[65px] rounded-[12px] overflow-hidden border border-[#eee] bg-gray-50">
                                                    {pet.avatar ? <img src={pet.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100"><PawPrint size={24} /></div>}
                                                </div>
                                            </div>
                                            <div className="pl-[15px] pr-[10px] flex-1">
                                                <div className="text-[14px] font-bold text-client-secondary mb-[2px] line-clamp-1">{pet.name}</div>
                                                <p className="text-[#999] font-medium text-[13px]">
                                                    {pet.weight || '0'}kg • {pet.age || '0'} tháng tuổi
                                                </p>
                                            </div>
                                            <div className="text-client-secondary ml-auto font-bold text-[14px] self-center">
                                                {petPrice.toLocaleString()}đ
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Phương thức thanh toán */}
                            <div className="mb-[35px] pt-[25px] border-t border-[#eee]">
                                <h3 className="text-[17px] font-bold text-client-secondary mb-[18px]">
                                    Phương thức thanh toán
                                </h3>
                                <div className="space-y-[15px]">
                                    {[
                                        { id: 'money', label: depositPercentage > 0 ? 'Thanh toán cọc online, còn lại tại quầy' : 'Thanh toán tại quầy' },
                                        { id: 'vnpay', label: 'Cổng thanh toán VNPAY' }
                                    ].map((method) => (
                                        <div key={method.id} className="space-y-3">
                                            <div onClick={() => setPaymentMethod(method.id)} className="flex items-center gap-[12px] cursor-pointer group">
                                                <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === method.id ? 'border-client-primary bg-white' : 'border-[#ddd]'}`}>
                                                    {paymentMethod === method.id && <div className="w-[10px] h-[10px] rounded-full bg-client-primary"></div>}
                                                </div>
                                                <span className={`text-[15px] font-medium transition-colors ${paymentMethod === method.id ? 'text-client-secondary font-bold' : 'text-gray-600'}`}>
                                                    {method.label}
                                                </span>
                                            </div>

                                            {/* Sub-options for deposit gateway when choosing "money" */}
                                            {method.id === 'money' && paymentMethod === 'money' && depositPercentage > 0 && (
                                                <div className="ml-8 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-3">
                                                    <div className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Chọn cổng thanh toán cọc:</div>
                                                    <div className="flex gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDepositGateway('vnpay')}
                                                            className={`flex-1 py-3 px-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2
                                                                ${depositGateway === 'vnpay' ? 'border-client-primary bg-white shadow-sm ring-1 ring-client-primary/10' : 'border-transparent bg-white/50 grayscale opacity-60'}`}
                                                        >
                                                            <span className="text-[13px] font-bold">VNPay</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chi tiết giá tiền */}
                            <div className="space-y-[15px] pt-[25px] border-t border-[#eee]">
                                <div className="flex justify-between text-[#666] text-[14px]">
                                    <span className="font-medium">Tạm tính</span>
                                    <span className="font-bold text-client-secondary">{booking.subTotal?.toLocaleString()}đ</span>
                                </div>
                                {booking.discount > 0 && (
                                    <div className="flex justify-between text-[#666] text-[14px]">
                                        <span className="font-medium">Giảm giá</span>
                                        <span className="font-bold text-green-600">-{booking.discount?.toLocaleString()}đ</span>
                                    </div>
                                )}

                                <div className="pt-[20px] border-t border-[#eee]">
                                    {depositPercentage > 0 && paymentMethod === 'money' && (
                                        <div className="flex justify-between items-center mb-[15px] p-[15px] bg-orange-50 rounded-[15px] border border-orange-100">
                                            <div className="text-[14px]">
                                                <div className="font-bold text-orange-800">Cần thanh toán cọc ({depositPercentage}%)</div>
                                                <div className="text-orange-600 text-[12px]">Xác nhận lịch ngay khi cọc</div>
                                            </div>
                                            <div className="text-[18px] font-bold text-orange-800">
                                                {Math.round((booking.total || 0) * depositPercentage / 100).toLocaleString()}đ
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <span className="text-[16px] font-bold text-client-secondary uppercase tracking-tight">Tổng cộng</span>
                                        <div className="text-[26px] text-client-primary font-bold tracking-tighter leading-none">{booking.total?.toLocaleString()}đ</div>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePayment}
                                    disabled={isProcessing}
                                    className={`w-full mt-[30px] py-[12px] px-[25px] rounded-[30px] text-white font-bold transition-all text-[15px] flex items-center justify-center gap-2 ${isProcessing
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-client-primary hover:bg-client-secondary cursor-pointer active:scale-95'
                                        }`}
                                >
                                    {isProcessing ? "Đang xử lý..." : "ĐẶT LỊCH NGAY"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FooterSub />
        </>
    );
};
