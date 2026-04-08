import { ProductBanner } from "../product/sections/ProductBanner";
import { Link } from "react-router-dom";
import { Sidebar } from "./sections/Sidebar";
import { useEffect, useState } from "react";
import { getOrderList } from "../../api/dashboard.api";
import { formatCurrency } from "../../helpers";
import dayjs from "dayjs";
import { cancelOrder } from "../../api/order.api";
import { toast } from "react-toastify";
import { CancelModal } from "../../components/ui/CancelModal";

export const OrderHistoryPage = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Lịch sử đơn hàng", to: "/dashboard/orders" },
    ];

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await getOrderList();
            if (response.success) {
                setOrders(response.orders);
            }
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const totalPages = Math.ceil(orders.length / pageSize);
    const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleCancelOrder = (order: any) => {
        setCancelModal({ isOpen: true, order });
    };

    const onConfirmCancel = async (reason: string) => {
        const order = cancelModal.order;
        if (!order) return;
        setIsCanceling(true);
        setCancelModal({ isOpen: false, order: null });
        try {
            const res = await cancelOrder(order._id, reason);
            if (res.code === "success") {
                toast.success(res.message || "Hủy đơn hàng thành công!");
                fetchOrders();
            } else {
                toast.error(res.message || "Hủy đơn hàng thất bại!");
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
            case "shipped":
            case "confirmed":
            case "shipping":
            case "paid":
                return "text-[#05A845]";
            case "pending":
            case "unpaid":
                return "text-[#007BFF]";
            case "cancelled":
            case "returned":
            case "refunded":
                return "text-[#ff0000]";
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
            "shipping": "Đang giao hàng",
            "shipped": "Đã giao hàng",
            "completed": "Giao thành công",
            "cancelled": "Đã hủy",
            "returned": "Trả hàng",
            "unpaid": "Chưa thanh toán",
            "paid": "Đã thanh toán",
            "refunded": "Đã hoàn tiền",
            "request_cancel": "Chờ duyệt hủy/hoàn tiền"
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
            "paypal": "PayPal"
        };
        return map[method] || method;
    };

    return (
        <>
            <ProductBanner
                pageTitle="Lịch sử đơn hàng"
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
                        <h3 className="text-[24px] font-[600] text-client-secondary mb-[25px]">
                            Lịch sử đơn hàng
                        </h3>

                        <div className="border border-[#eee] rounded-[12px] overflow-hidden bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#F9F9F9] border-b border-[#eee]">
                                    <tr>
                                        <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Mã đơn hàng</th>
                                        <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Ngày</th>
                                        <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Trạng thái</th>
                                        <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Thanh toán</th>
                                        <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Tổng</th>
                                        <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-[20px] text-center text-[15px]">Đang tải...</td></tr>
                                    ) : (
                                        paginatedOrders.map((order, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-[20px] text-[14px] text-[#505050] font-[500]">#{order.code}</td>
                                                <td className="p-[20px] text-[14px] text-[#7d7b7b]">{dayjs(order.createdAt).format("DD/MM/YYYY")}</td>
                                                <td className={`p-[20px] text-[14px] font-[600] ${getStatusColor(order.orderStatus || "pending")}`}>{getStatusText(order.orderStatus || "pending")}</td>
                                                <td className={`p-[20px] text-[14px] font-[500] ${getStatusColor(order.paymentStatus || "unpaid")}`}>
                                                    {getStatusText(order.paymentStatus || "unpaid")} <span className="text-[#999] font-[400] text-[12px]">({getPaymentMethodText(order.paymentMethod)})</span>
                                                </td>
                                                <td className="p-[20px] text-[14px] text-client-primary font-[700]">{formatCurrency(order.total)}</td>
                                                <td className="p-[20px]">
                                                    <div className="flex flex-col gap-[8px]">
                                                        <Link
                                                            to={`/dashboard/order/detail/${order._id}`}
                                                            className="flex items-center gap-[6px] text-[13px] text-[#7d7b7b] hover:text-client-primary transition-default font-[500]"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-[16px] h-[16px]">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.644C3.412 8.1 7.288 5 12 5c4.711 0 8.58 3.1 9.964 6.678a1.012 1.012 0 0 1 0 .644C20.58 15.9 16.711 19 12 19c-4.712 0-8.58-3.1-9.964-6.678Z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                            </svg>
                                                            Xem chi tiết
                                                        </Link>
                                                        {(order.orderStatus === "pending" || order.orderStatus === "confirmed") && (
                                                            <button
                                                                onClick={() => handleCancelOrder(order)}
                                                                disabled={isCanceling}
                                                                className="flex items-center gap-[6px] text-[13px] text-red-500 hover:text-red-600 transition-default font-[500] cursor-pointer disabled:opacity-50"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-[16px] h-[16px]">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                                </svg>
                                                                Hủy đơn hàng
                                                            </button>
                                                        )}
                                                        {order.orderStatus === "completed" && (
                                                            <Link
                                                                to={`/dashboard/order/detail/${order._id}`}
                                                                className="flex items-center gap-[6px] text-[13px] text-[#7d7b7b] hover:text-client-primary transition-default font-[500]"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-[16px] h-[16px]">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                                                </svg>
                                                                Đánh giá
                                                            </Link>
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
                onClose={() => setCancelModal({ isOpen: false, order: null })}
                onConfirm={onConfirmCancel}
                paymentStatus={cancelModal.order?.paymentStatus}
            />
        </>
    );
};
