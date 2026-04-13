import { ProductBanner } from "../product/sections/ProductBanner";
import { Link } from "react-router-dom";
import { Sidebar } from "./sections/Sidebar";
import { useEffect, useState, useMemo } from "react";
import { getMyBookings, cancelBooking, getBookingConfig } from "../../api/booking.api";
import { getMyPets } from "../../api/pet.api";
import { formatCurrency } from "../../helpers";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { CancelModal } from "../../components/ui/CancelModal";
import Select from "react-select";
import { Icon } from "@iconify/react";


export const BookingHistoryPage = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [pets, setPets] = useState<any[]>([]);
    const [selectedPet, setSelectedPet] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; booking: any }>({ isOpen: false, booking: null });
    const [currentPage, setCurrentPage] = useState(1);
    const [config, setConfig] = useState<any>(null);
    const pageSize = 10;

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Lịch sử dịch vụ", to: "/dashboard/bookings" },
    ];

    const fetchConfig = async () => {
        try {
            const res = await getBookingConfig();
            if (res.code === 200) setConfig(res.data);
        } catch (error) {
            console.error("Failed to fetch config:", error);
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await getMyBookings();
            if (response.code === 200) {
                setBookings(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPets = async () => {
        try {
            const response = await getMyPets();
            if (response.code === 200) {
                setPets(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch pets:", error);
        }
    };

    useEffect(() => {
        fetchBookings();
        fetchPets();
        fetchConfig();
    }, []);

    const filteredBookings = useMemo(() => {
        if (!selectedPet) return bookings;
        return bookings.filter(b =>
            b.petIds?.some((p: any) => (p._id || p.id) === selectedPet)
        );
    }, [bookings, selectedPet]);

    const totalPages = Math.ceil(filteredBookings.length / pageSize);
    const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const petOptions = useMemo(() => [
        { value: "", label: "Tất cả các bé" },
        ...pets.map(pet => ({
            value: pet._id,
            label: pet.name
        }))
    ], [pets]);

    const handleCancelBooking = (booking: any) => {
        setCancelModal({ isOpen: true, booking });
    };

    const onConfirmCancel = async (reason: string) => {
        const booking = cancelModal.booking;
        if (!booking) return;
        setIsCanceling(true);
        setCancelModal({ isOpen: false, booking: null });
        try {
            const res = await cancelBooking(booking._id, reason);
            if (res.code === 200) {
                toast.success(res.message || "Hủy lịch đặt thành công!");
                fetchBookings();
            } else {
                toast.error(res.message || "Hủy lịch đặt thất bại!");
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
                return "bg-green-100 text-green-700";
            case "confirmed":
                return "bg-blue-100 text-blue-700";
            case "pending":
                return "bg-orange-100 text-orange-700";
            case "cancelled":
            case "refunded":
                return "bg-red-100 text-red-700";
            case "in-progress":
                return "bg-yellow-100 text-yellow-700";
            case "delayed":
                return "bg-purple-100 text-purple-700";
            case "no-show":
                return "bg-gray-100 text-gray-700";
            case "request_cancel":
                return "bg-orange-100 text-orange-700 border border-orange-200";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getStatusText = (status: string) => {
        const map: any = {
            "pending": "Đang chờ",
            "confirmed": "Đã xác nhận",
            "completed": "Hoàn thành",
            "cancelled": "Đã hủy",
            "no-show": "Không đến",
            "in-progress": "Đang thực hiện",
            "delayed": "Trễ hẹn",
            "refunded": "Đã hoàn tiền",
            "request_cancel": "Chờ duyệt hủy/hoàn tiền"
        };
        return map[status] || status;
    };

    return (
        <>
            <ProductBanner
                pageTitle="Lịch sử dịch vụ"
                breadcrumbs={breadcrumbs}
                url="https://pawsitive.bold-themes.com/coco/wp-content/uploads/sites/3/2019/07/blog_standard_05.jpg"
                className="bg-center"
            />

            <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
                <div className="w-[25%] px-[12px] flex">
                    <Sidebar />
                </div>
                <div className="w-[75%] px-[12px]">
                    <div className="mt-[100px] p-[35px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[12px]">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[24px] font-black text-[#181818]">
                                Lịch sử đặt lịch
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="hidden sm:block">
                                        <Icon icon="mdi:paw" className="text-client-primary text-lg opacity-50" />
                                    </div>
                                    <Select
                                        options={petOptions}
                                        value={petOptions.find(opt => opt.value === selectedPet)}
                                        onChange={(opt: any) => setSelectedPet(opt?.value || "")}
                                        placeholder="Lọc theo bé cưng"
                                        isSearchable={false}
                                        className="min-w-[200px]"
                                        styles={{
                                            control: (base, state) => ({
                                                ...base,
                                                borderRadius: '10px',
                                                padding: '2px 5px',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                backgroundColor: '#fff',
                                                borderColor: state.isFocused ? '#FF6262' : '#eee',
                                                boxShadow: 'none',
                                                '&:hover': { borderColor: '#FF6262' },
                                                cursor: 'pointer'
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                fontSize: '14px',
                                                fontWeight: state.isSelected ? '600' : '400',
                                                backgroundColor: state.isSelected ? '#FF6262' : state.isFocused ? '#FFF5F5' : '#fff',
                                                color: state.isSelected ? '#fff' : '#181818',
                                                '&:active': { backgroundColor: '#FF6262' },
                                                cursor: 'pointer'
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                border: '1px solid #eee',
                                                zIndex: 50
                                            })
                                        }}
                                    />
                                </div>
                                <Link className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white flex items-center gap-[8px]" to="/services">
                                    <span className="relative z-10">Đặt lịch mới</span>
                                    <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                </Link>
                            </div>
                        </div>

                        <div className="border border-[#eee] rounded-[12px] overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#F9F9F9] border-b border-[#eee]">
                                    <tr>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Mã đặt lịch</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Dịch vụ</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Ngày giờ</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Bé cưng</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Trạng thái</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Tổng tiền</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {loading ? (
                                        <tr><td colSpan={7} className="p-[20px] text-center text-[16px]">Đang tải...</td></tr>
                                    ) : paginatedBookings.length === 0 ? (
                                        <tr><td colSpan={7} className="p-[20px] text-center text-[16px]">Chưa có lịch đặt nào</td></tr>
                                    ) : (
                                        paginatedBookings.map((booking, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-[20px] text-[15px] text-[#7d7b7b]">#{booking.code}</td>
                                                <td className="p-[20px] text-[15px] font-[500] text-client-secondary">
                                                    {booking.serviceId?.name || "N/A"}
                                                </td>
                                                <td className="p-[20px] text-[15px] text-[#7d7b7b]">
                                                    {booking.originalStart && dayjs(booking.originalStart).format("HH:mm") !== dayjs(booking.start).format("HH:mm") && (
                                                        <div className="text-[11px] text-red-500 line-through opacity-60">
                                                            {dayjs(booking.originalStart).format("HH:mm")}
                                                        </div>
                                                    )}
                                                    <div className="font-[500]">{dayjs(booking.start).format("DD/MM/YYYY")}</div>
                                                    <div className="text-[13px]">{dayjs(booking.start).format("HH:mm")}</div>
                                                </td>
                                                <td className="p-[20px] text-[15px] text-[#7d7b7b]">
                                                    {booking.petIds?.map((pet: any) => pet.name).join(", ") || "N/A"}
                                                </td>
                                                <td className="p-[20px]">
                                                    <span className={`px-3 py-1 rounded-full text-[12px] font-[600] ${getStatusColor(booking.bookingStatus)}`}>
                                                        {getStatusText(booking.bookingStatus)}
                                                    </span>
                                                </td>
                                                <td className="p-[20px] text-[15px]">
                                                    <div className="text-client-primary font-[700]">
                                                        {formatCurrency(booking.total || 0)}
                                                    </div>
                                                    {booking.paymentStatus === 'partially_paid' && booking.depositAmount > 0 && booking.depositAmount < booking.total && (
                                                        <div className="mt-1 text-[11px] leading-tight space-y-0.5">
                                                            <div className="text-emerald-600 font-[600]">
                                                                Đã cọc: {formatCurrency(booking.depositAmount)}
                                                            </div>
                                                            <div className="text-[#FF5630] font-[600]">
                                                                Còn lại: {formatCurrency((booking.total || 0) - (booking.depositAmount || 0))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {booking.paymentStatus === 'paid' && (
                                                        <div className="mt-1 text-[11px] text-emerald-600 font-[600]">✓ Đã thanh toán</div>
                                                    )}
                                                </td>
                                                <td className="p-[20px]">
                                                    <div className="flex flex-col gap-2">
                                                        <Link
                                                            to={`/dashboard/booking/detail/${booking._id}`}
                                                            className="text-[14px] text-client-primary hover:underline font-[500]"
                                                        >
                                                            Chi tiết
                                                        </Link>
                                                        {(booking.bookingStatus === "pending" || booking.bookingStatus === "confirmed") && (
                                                            <button
                                                                onClick={() => handleCancelBooking(booking)}
                                                                disabled={isCanceling}
                                                                className="text-[14px] text-red-500 hover:underline font-[500] cursor-pointer text-left disabled:opacity-50"
                                                            >
                                                                ủy lịch
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#eee] text-[#7d7b7b] hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                    </svg>
                                </button>

                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-all ${currentPage === i + 1 ? "bg-client-primary border-client-primary text-white" : "border-[#eee] text-[#7d7b7b] hover:bg-gray-50"}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#eee] text-[#7d7b7b] hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CancelModal
                isOpen={cancelModal.isOpen}
                onClose={() => setCancelModal({ isOpen: false, booking: null })}
                onConfirm={onConfirmCancel}
                title="Lý Do Hủy Lịch"
                confirmText="HỦY LỊCH ĐẶT"
                isBooking={true}
                paymentStatus={cancelModal.booking?.paymentStatus}
                refundCancellationHours={config?.refundCancellationHours}
                startTime={cancelModal.booking?.start}
            />
        </>
    );
};

