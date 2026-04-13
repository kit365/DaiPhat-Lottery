import { useState } from "react";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getMyBooking, exportBookingPdf, cancelBooking } from "../../api/booking.api";
import { formatCurrency } from "../../helpers";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { CancelModal } from "../../components/ui/CancelModal";


export const BookingDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exporting, setExporting] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    const { data: bookingRes, isLoading: loading } = useQuery<any>({
        queryKey: ["booking", id],
        queryFn: () => getMyBooking(id!),
        enabled: !!id,
        refetchInterval: 5000, // Sync every 5 seconds
    });
    const booking = bookingRes?.data;

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Lịch sử dịch vụ", to: "/dashboard/bookings" },
        { label: `Chi tiết đặt lịch`, to: `/dashboard/booking/detail/${id}` },
    ];

    const handleExportPdf = async () => {
        if (!booking) return;
        setExporting(true);
        try {
            const blob = await exportBookingPdf(booking.code, booking.customerPhone);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `booking_${booking.code}.pdf`);
            document.body.appendChild(link);
            link.click();
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
            toast.success("Đã tải xuống phiếu dịch vụ!");
        } catch (error) {
            console.error("Failed to export booking pdf:", error);
            toast.error("Xuất PDF thất bại!");
        } finally {
            setExporting(false);
        }
    };

    const handleCancelBooking = () => {
        setIsCancelModalOpen(true);
    };

    const onConfirmCancel = async (reason: string) => {
        if (!booking) return;
        setIsCancelModalOpen(false);
        setIsCanceling(true);
        try {
            const res = await cancelBooking(booking._id, reason);
            if (res.code === 200) {
                toast.success(res.message || "Hủy đặt lịch thành công!");
                navigate("/dashboard/bookings");
            } else {
                toast.error(res.message || "Hủy đặt lịch thất bại!");
            }
        } catch (error) {
            toast.error("Đã có lỗi xảy ra!");
        } finally {
            setIsCanceling(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
            case "paid":
                return "text-[#05A845]";
            case "confirmed":
                return "text-[#007BFF]";
            case "pending":
            case "unpaid":
                return "text-[#f97316]";
            case "cancelled":
            case "refunded":
                return "text-[#ff0000]";
            case "in-progress":
                return "text-[#FFAB00]";
            case "delayed":
                return "text-[#FF5630]";
            case "request_cancel":
                return "text-[#f97316]";
            default:
                return "text-[#7d7b7b]";
        }
    };

    const getStatusText = (status: string) => {
        const map: any = {
            "pending": "Chờ xác nhận",
            "confirmed": "Đã xác nhận",
            "completed": "Hoàn thành",
            "cancelled": "Đã hủy",
            "delayed": "Trễ giờ",
            "refunded": "Đã hoàn tiền",
            "in-progress": "Đang làm",
            "request_cancel": "Chờ duyệt hủy/hoàn tiền"
        };
        return map[status] || status;
    };

    if (loading) return <div className="p-10 text-center text-[16px]">Đang tải...</div>;
    if (!booking) return <div className="p-10 text-center text-[16px]">Không tìm thấy lịch đặt!</div>;

    return (
        <>
            <ProductBanner
                pageTitle="Chi tiết đặt lịch"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                className="bg-top"
            />

            <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
                <div className="w-[25%] px-[12px] flex">
                    <Sidebar />
                </div>
                <div className="w-[75%] px-[12px]">
                    <div className="mt-[100px] p-[35px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[12px]">
                        <div className="flex justify-between items-center mb-[25px]">
                            <h3 className="text-[24px] font-[600] text-client-secondary">
                                Chi tiết dịch vụ
                            </h3>
                            <Link className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[15px] font-[500] text-[14px] text-white flex items-center gap-[8px] cursor-pointer" to={"/dashboard/bookings"}>
                                <span className="relative z-10">Trở lại</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </div>

                        {/* Booking Stepper */}
                        {["pending", "confirmed", "in-progress", "completed", "cancelled"].includes(booking.bookingStatus) && (
                            <div className="mb-[60px] pt-[20px] pb-[40px] px-[20px] bg-[#fdfdfd] border border-[#f5f5f5] rounded-[20px] relative">
                                <div className="flex justify-between relative z-10 w-full max-w-[800px] mx-auto">
                                    {[
                                        { key: "pending", label: "Chờ xác nhận", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 18 4.5H6a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 6 18.75h.75m11.25-3V3.75m-11.25 15V6.75M12 9V3.75m-6 0h12" /></svg> },
                                        { key: "confirmed", label: "Đã xác nhận", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" /></svg> },
                                        { key: "in-progress", label: "Đang làm", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg> },
                                        { key: "completed", label: "Hoàn thành", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg> },
                                    ].map((step, index, arr) => {
                                        const successFlow = ["pending", "confirmed", "in-progress", "completed"];
                                        const isCancelled = booking.bookingStatus === "cancelled";
                                        const currentIndex = successFlow.indexOf(booking.bookingStatus);
                                        const isPast = currentIndex !== -1 && index < currentIndex;
                                        const isCurrent = currentIndex !== -1 && index === currentIndex;
                                        const isLast = index === arr.length - 1;

                                        let stepColorClass = "";
                                        let labelColorClass = "";

                                        if (isCancelled) {
                                            const history = booking.statusHistory || [];
                                            const wasStepReached = index === 0 || history.some((h: any) => h.status === step.key);
                                            stepColorClass = wasStepReached ? "bg-gradient-to-br from-gray-400 to-gray-600 text-white" : "bg-white text-gray-300 border-[2px] border-[#eee]";
                                            labelColorClass = wasStepReached ? "text-gray-600" : "text-gray-300";
                                        } else {
                                            if (isCurrent || isPast) {
                                                stepColorClass = "bg-gradient-to-br from-[#ff7e67] to-[#e1554e] text-white ring-4 ring-red-100";
                                                labelColorClass = "text-client-secondary";
                                            } else {
                                                stepColorClass = "bg-white text-gray-400 border-[2px] border-[#eee]";
                                                labelColorClass = "text-gray-400";
                                            }
                                        }

                                        return (
                                            <div key={step.key} className="flex flex-col items-center flex-1 relative">
                                                {!isLast && (
                                                    <div className="absolute top-[30px] left-[50%] w-full h-[3px] bg-[#eee] -z-10">
                                                        <div
                                                            className="h-full bg-client-primary transition-all duration-700 ease-in-out"
                                                            style={{
                                                                width: (isPast && !isCancelled) ? "100%" : "0%"
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-500 shadow-md ${stepColorClass}`}>
                                                    {step.icon}
                                                </div>
                                                <div className="mt-[15px] flex flex-col items-center">
                                                    <span className={`text-[13px] font-[700] uppercase tracking-wider transition-colors duration-500 text-center ${labelColorClass}`}>
                                                        {step.label}
                                                    </span>
                                                    {isCurrent && !isCancelled && (
                                                        <span className="text-[10px] text-red-400 font-[500] animate-pulse mt-1">Đang thực hiện</span>
                                                    )}
                                                    {isCancelled && booking.bookingStatus === step.key && (
                                                        <span className="text-[10px] text-red-600 font-[700] mt-1">ĐÃ HỦY</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="border border-[#eee] rounded-[12px] w-full overflow-hidden">
                            <div className="flex justify-between items-center p-[30px] border-b border-[#eee]">
                                <div className="flex items-center gap-[15px]">
                                    <img src="https://i.imgur.com/V2kwkkK.png" alt="" className="w-[150px]" />
                                </div>
                                <div className="text-right">
                                    <h2 className="uppercase text-[22px] text-client-secondary font-[700] mb-[15px]">PHIẾU DỊCH VỤ</h2>
                                    <p className="text-[#7d7b7b] text-[15px] mb-[5px]">Mã: #{booking.code}</p>
                                    <p className="text-[#7d7b7b] text-[15px] mb-[15px]">Ngày đặt: {dayjs(booking.createdAt).format("DD/MM/YYYY HH:mm")}</p>
                                    <button
                                        onClick={handleExportPdf}
                                        disabled={exporting}
                                        className="bg-client-primary hover:bg-client-secondary transition-default text-white font-[600] text-[14px] py-[15px] px-[25px] rounded-[6px] cursor-pointer disabled:opacity-50 flex items-center gap-2 ml-auto mb-2"
                                    >
                                        {exporting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        Xuất hóa đơn PDF
                                    </button>
                                    {(booking.bookingStatus === "pending" || booking.bookingStatus === "confirmed") && (
                                        <button
                                            onClick={handleCancelBooking}
                                            disabled={isCanceling}
                                            className="bg-red-500 hover:bg-red-600 transition-default text-white font-[600] text-[14px] py-[15px] px-[25px] rounded-[6px] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 ml-auto"
                                        >
                                            {isCanceling && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                            Hủy đặt lịch
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-[30px] p-[30px] border-b border-[#eee] bg-[#fdfdfd]">
                                <div>
                                    <h4 className="font-bold text-client-secondary mb-3 uppercase text-[14px] tracking-wider text-client-primary">Thông tin khách hàng</h4>
                                    <div className="space-y-2">
                                        <p className="text-[15px]"><span className="text-[#7d7b7b] w-[120px] inline-block font-[500]">Khách hàng:</span> <span className="font-semibold text-client-secondary">{booking.customerName}</span></p>
                                        <p className="text-[15px]"><span className="text-[#7d7b7b] w-[120px] inline-block font-[500]">Điện thoại:</span> <span className="font-semibold text-client-secondary">{booking.customerPhone}</span></p>
                                        <p className="text-[15px]"><span className="text-[#7d7b7b] w-[120px] inline-block font-[500]">Ghi chú:</span> <span className="italic text-[#7d7b7b]">{booking.notes || "Không có"}</span></p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-client-secondary mb-3 uppercase text-[14px] tracking-wider text-client-primary">Trạng thái & Thanh toán</h4>
                                    <div className="space-y-2">
                                        <p className="text-[15px]"><span className="text-[#7d7b7b] w-[140px] inline-block font-[500]">Trạng thái:</span> <span className={`font-bold ${getStatusColor(booking.bookingStatus)}`}>{getStatusText(booking.bookingStatus)}</span></p>
                                        <p className="text-[15px]">
                                            <span className="text-[#7d7b7b] w-[140px] inline-block font-[500]">Thanh toán:</span>
                                            <span className={`font-bold uppercase ${booking.paymentStatus === 'paid' ? 'text-[#05A845]' : booking.paymentStatus === 'partially_paid' ? 'text-[#007BFF]' : 'text-red-500'}`}>
                                                {booking.paymentStatus === 'paid' ? 'Đã hoàn thành' : booking.paymentStatus === 'partially_paid' ? 'Đã đặt cọc' : 'Chưa thanh toán'}
                                            </span>
                                        </p>
                                        <p className="text-[15px]">
                                            <span className="text-[#7d7b7b] w-[140px] inline-block font-[500]">Phương thức:</span>
                                            <span className="font-semibold text-client-secondary">
                                                {booking.paymentMethod === 'money' ? 'Tiền mặt tại quầy' : booking.paymentMethod === 'vnpay' ? 'Ví VNPAY' : booking.paymentMethod === 'zalopay' ? 'Ví ZaloPay' : booking.paymentMethod}
                                            </span>
                                        </p>
                                        {booking.paymentStatus !== 'paid' && booking.depositAmount > 0 && (
                                            <>
                                                <p className="text-[15px]">
                                                    <span className="text-[#7d7b7b] w-[140px] inline-block font-[500]">Tiền đã cọc:</span>
                                                    <span className="font-bold text-[#05A845]">
                                                        {formatCurrency(booking.depositAmount)}
                                                        {booking.depositMethod && (
                                                            <span className="ml-2 text-[12px] font-medium text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded italic">
                                                                (Qua {booking.depositMethod})
                                                            </span>
                                                        )}
                                                    </span>
                                                </p>
                                                {booking.paymentStatus === 'partially_paid' && (
                                                    <p className="text-[15px]">
                                                        <span className="text-[#7d7b7b] w-[140px] inline-block font-[500]">Số tiền còn lại:</span>
                                                        <span className="font-bold text-[#FF5630]">{formatCurrency(booking.total - booking.depositAmount)}</span>
                                                    </p>
                                                )}
                                            </>
                                        )}
                                        {booking.bookingStatus === "cancelled" && (
                                            <p className="text-[14px] bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 mt-2">
                                                <span className="font-bold">Lý do hủy:</span> {booking.cancelledReason || "Theo yêu cầu của khách hàng"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#F9F9F9] border-b border-[#eee]">
                                    <tr>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Nội dung dịch vụ</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary text-center">Ngày thực hiện</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary text-center">Giờ hẹn</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary text-right">Tổng cộng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-[#eee]">
                                        <td className="p-[20px]">
                                            <p className="font-[600] text-client-secondary text-[16px] mb-3">{booking.serviceId?.name}</p>
                                            <div className="space-y-2">
                                                {booking.petIds?.map((pet: any) => {
                                                    const mapping = booking.petStaffMap?.find((m: any) =>
                                                        (m.petId?._id || m.petId) === pet._id
                                                    );
                                                    const petStatus = mapping?.status || 'pending';

                                                    return (
                                                        <div key={pet._id} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-8 h-8 rounded-full bg-client-primary/10 flex items-center justify-center overflow-hidden border border-client-primary/20">
                                                                        {pet.avatar ? (
                                                                            <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="text-client-primary font-bold text-[12px]">{pet.name?.charAt(0)}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <p className="text-[13px] font-bold text-client-secondary leading-tight">{pet.name}</p>
                                                                        <p className="text-[10px] text-[#7d7b7b]">{pet.breed || (pet.type === 'dog' ? 'Chó' : 'Mèo')}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold ${booking.bookingStatus === 'cancelled' ? 'bg-red-50 text-red-500 border border-red-100' :
                                                                        petStatus === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                            petStatus === 'in-progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                                'bg-gray-100 text-gray-500'
                                                                        }`}>
                                                                        {booking.bookingStatus === 'cancelled' ? 'Đã hủy' : petStatus === 'completed' ? 'Đã xong' : petStatus === 'in-progress' ? 'Đang làm' : 'Chờ làm'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="p-[20px] text-center text-[15px] font-[500]">{dayjs(booking.start).format("DD/MM/YYYY")}</td>
                                        <td className="p-[20px] text-center text-[14px]">
                                            {booking.originalStart && dayjs(booking.originalStart).format("HH:mm") !== dayjs(booking.start).format("HH:mm") && (
                                                <span className="text-[11px] text-red-500 line-through opacity-50 mr-2">
                                                    {dayjs(booking.originalStart).format("HH:mm")}
                                                </span>
                                            )}
                                            <span className="font-[600] text-client-primary">{dayjs(booking.start).format("HH:mm")}</span>
                                        </td>
                                        <td className="p-[20px] text-right font-[700] text-[18px] text-client-primary">
                                            {formatCurrency(booking.total || 0)}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="p-[20px] text-right font-[600] text-[#7d7b7b]">Thành tiền:</td>
                                        <td className="p-[20px] text-right font-[800] text-[22px] text-client-primary">{formatCurrency(booking.total || 0)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {booking.serviceId?.procedure && (
                                <div className="p-[30px] border-t border-[#eee] bg-[#f9f9f9]/30">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-client-primary/10 flex items-center justify-center text-client-primary">
                                            <Icon icon="solar:clipboard-list-bold-duotone" width={18} />
                                        </div>
                                        <h4 className="font-bold text-client-secondary text-[16px]">Quy trình dịch vụ</h4>
                                    </div>
                                    <div
                                        className="text-[15px] text-[#505050] leading-relaxed prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: booking.serviceId.procedure }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CancelModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={onConfirmCancel}
                title="Lý Do Hủy Lịch"
                confirmText="HỦY LỊCH ĐẶT"
                isBooking={true}
                paymentStatus={booking?.paymentStatus}
            />
        </>
    );
};
