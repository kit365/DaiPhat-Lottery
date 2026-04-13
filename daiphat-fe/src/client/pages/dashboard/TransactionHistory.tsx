import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import { Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { getOrderList, getBoardingBookingList } from "../../api/dashboard.api";
import { getMyBookings } from "../../api/booking.api";
import { formatCurrency } from "../../helpers";
import dayjs from "dayjs";

export const TransactionHistoryPage = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Lịch sử giao dịch", to: "/dashboard/transactions" },
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orderRes, bookingRes] = await Promise.all([
                getOrderList(),
                getMyBookings()
            ]);

            if (orderRes.success) {
                setOrders(orderRes.orders);
            }
            if (bookingRes.code === 200) {
                setBookings(bookingRes.data);
            }


        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setCurrentPage(1);
    }, []);

    const transactions = useMemo(() => {
        const orderTx = orders.map(o => ({
            id: o._id,
            code: o.code,
            date: o.createdAt,
            type: "Shopping",
            description: `Thanh toán đơn hàng #${o.code}`,
            amount: o.total || 0,
            method: o.paymentMethod,
            status: o.paymentStatus || (o.orderStatus === "completed" ? "paid" : "pending"),
            link: `/dashboard/order/detail/${o._id}`
        }));

        const bookingTx = bookings.map(b => ({
            id: b._id,
            code: b.code,
            date: b.start,
            type: "Service",
            description: `Thanh toán dịch vụ: ${b.serviceId?.name || "Dịch vụ"}`,
            amount: b.total || 0,
            method: b.paymentMethod || "cod",
            status: b.paymentStatus || (b.bookingStatus === "completed" ? "paid" : "pending"),
            link: `/dashboard/booking/detail/${b._id}`
        }));

        return [...orderTx, ...bookingTx].sort((a, b) =>
            dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
        );
    }, [orders, bookings, boardingBookings]);

    // Pagination logic
    const totalPages = Math.ceil(transactions.length / pageSize);
    const paginatedTransactions = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid":
            case "completed":
                return "bg-green-100 text-green-700";
            case "pending":
            case "unpaid":
                return "bg-orange-100 text-orange-700";
            case "confirmed":
                return "bg-blue-100 text-blue-700";
            case "cancelled":
                return "bg-red-100 text-red-700";
            case "refunded":
                return "bg-purple-100 text-purple-700";
            case "partial":
            case "partially_paid":
                return "bg-blue-100 text-blue-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getStatusText = (status: string) => {
        const map: any = {
            "paid": "Thành công",
            "completed": "Hoàn thành",
            "pending": "Đang chờ",
            "unpaid": "Chưa thanh toán",
            "refunded": "Đã hoàn tiền",
            "cancelled": "Đã hủy",
            "confirmed": "Đã xác nhận",
            "partial": "Đã đặt cọc",
            "partially_paid": "Đã đặt cọc"
        };
        return map[status] || status;
    };

    const getPaymentMethodText = (method: string) => {
        const map: any = {
            "cod": "COD",
            "money": "Tiền mặt",
            "vnpay": "VNPay",
            "momo": "Momo",
            "zalopay": "ZaloPay",
            "paypal": "PayPal",
            "prepaid": "Trả trước"
        };
        return map[method?.toLowerCase()] || method;
    };

    return (
        <>
            <ProductBanner
                pageTitle="Lịch sử giao dịch"
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
                                Lịch sử giao dịch
                            </h3>
                            <div className="text-[14px] text-[#7d7b7b]">
                                Tổng cộng: <span className="font-bold text-client-primary">{transactions.length}</span> giao dịch
                            </div>
                        </div>

                        <div className="border border-[#eee] rounded-[12px] overflow-hidden bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#F9F9F9] border-b border-[#eee]">
                                    <tr>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Thời gian</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Mô tả</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Trạng thái</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary">Số tiền</th>
                                        <th className="p-[20px] text-[16px] font-[600] text-client-secondary text-right">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-[20px] text-center text-[15px]">Đang tải...</td></tr>
                                    ) : paginatedTransactions.length === 0 ? (
                                        <tr><td colSpan={5} className="p-[20px] text-center text-[15px]">Chưa có giao dịch nào</td></tr>
                                    ) : (
                                        paginatedTransactions.map((tx, idx) => (
                                            <tr key={tx.id || idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-[20px] text-[15px] text-[#7d7b7b]">
                                                    <div className="font-[500]">{dayjs(tx.date).format("DD/MM/YYYY")}</div>
                                                    <div className="text-[13px] opacity-70">{dayjs(tx.date).format("HH:mm")}</div>
                                                </td>
                                                <td className="p-[20px]">
                                                    <div className="text-[15px] font-[600] text-client-secondary">
                                                        {tx.description}
                                                    </div>
                                                    <div className="text-[12px] text-[#999] mt-1 italic">
                                                        HT: {getPaymentMethodText(tx.method)}
                                                    </div>
                                                </td>
                                                <td className="p-[20px]">
                                                    <span className={`px-3 py-1 rounded-full text-[12px] font-[600] inline-block ${getStatusColor(tx.status)}`}>
                                                        {getStatusText(tx.status)}
                                                    </span>
                                                </td>
                                                <td className="p-[20px] text-[15px] text-client-primary font-[700]">
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                                <td className="p-[20px] text-right">
                                                    <Link
                                                        to={tx.link}
                                                        className="text-[14px] text-client-primary hover:underline font-[600]"
                                                    >
                                                        Chi tiết
                                                    </Link>
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
        </>
    );
};
