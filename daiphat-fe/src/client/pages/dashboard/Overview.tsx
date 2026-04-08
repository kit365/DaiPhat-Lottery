import StarIcon from "@mui/icons-material/Star";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getBoardingBookingList, getDashboardOverview } from "../../api/dashboard.api";
import { formatCurrency } from "../../helpers";
import { useWishlistStore } from "../../../stores/useWishlistStore";

export const OverviewPage = () => {
    const { items: wishlistItems } = useWishlistStore();

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Tổng quan", to: "/dashboard/overview" },
    ];

    const { data: overviewRes, isLoading: overviewLoading } = useQuery<any>({
        queryKey: ["dashboard-overview"],
        queryFn: getDashboardOverview,
    });

    const statsData = overviewRes?.data?.stats;
    const recentOrders = overviewRes?.data?.recentOrders || [];
    const recentReviews = overviewRes?.data?.recentReviews || [];

    const stats = [
        {
            label: "Tổng đơn hàng",
            value: statsData?.totalOrders || 0,
            bgColor: "bg-[#0aa84812]",
            iconBg: "bg-[#05A845]",
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[40px]"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"></path></svg>
        },
        {
            label: "Đơn hoàn tất",
            value: statsData?.completedOrders || 0,
            bgColor: "bg-[#66aaee1f]",
            iconBg: "bg-[#6ae]",
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[40px]"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"></path></svg>
        },
        {
            label: "Đơn chờ xử lý",
            value: statsData?.pendingOrders || 0,
            bgColor: "bg-[#ffa5001c]",
            iconBg: "bg-[#ffa500]",
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[40px]"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path></svg>
        },
        {
            label: "Đơn đã hủy",
            value: statsData?.cancelledOrders || 0,
            bgColor: "bg-[#ff000012]",
            iconBg: "bg-[#DB4437]",
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[40px]"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"></path></svg>
        },
        {
            label: "Yêu thích",
            value: wishlistItems.length,
            bgColor: "bg-[#80008014]",
            iconBg: "bg-[#800080]",
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[40px]"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"></path></svg>
        },
        {
            label: "Đánh giá",
            value: statsData?.reviewCount || 0,
            bgColor: "bg-[#ab977424]",
            iconBg: "bg-[#AB9774]",
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[40px]"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"></path></svg>
        }
    ];

    const { data: boardingRes, isLoading: boardingLoading } = useQuery<any>({
        queryKey: ["dashboard-boarding-bookings"],
        queryFn: getBoardingBookingList,
    });

    const boardingBookings = Array.isArray(boardingRes?.data)
        ? boardingRes.data
        : Array.isArray(boardingRes?.data?.data)
            ? boardingRes.data.data
            : Array.isArray(boardingRes)
                ? boardingRes
                : [];

    const getBoardingStatus = (status?: string) => {
        const normalized = String(status || "pending").toLowerCase();
        const map: Record<string, { text: string; cls: string }> = {
            pending: { text: "Đang chờ", cls: "bg-orange-100 text-orange-700" },
            confirmed: { text: "Đã xác nhận", cls: "bg-blue-100 text-blue-700" },
            "checked-in": { text: "Đang lưu trú", cls: "bg-purple-100 text-purple-700" },
            "checked-out": { text: "Hoàn thành", cls: "bg-green-100 text-green-700" },
            completed: { text: "Hoàn thành", cls: "bg-green-100 text-green-700" },
            cancelled: { text: "Đã hủy", cls: "bg-red-100 text-red-700" },
        };
        return map[normalized] || { text: normalized, cls: "bg-gray-100 text-gray-700" };
    };

    const getOrderStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "text-[#05A845]";
            case "pending": return "text-[#007BFF]";
            case "shipping": return "text-[#FFAB00]";
            case "cancelled": return "text-[#ff0000]";
            default: return "text-[#7d7b7b]";
        }
    };

    const getOrderStatusText = (status: string) => {
        const map: any = {
            "pending": "Đang xử lý",
            "confirmed": "Đã xác nhận",
            "shipping": "Đang giao",
            "completed": "Hoàn thành",
            "cancelled": "Đã hủy",
            "returned": "Trả hàng",
        };
        return map[status] || status;
    };

    return (
        <>
            <ProductBanner
                pageTitle="Tổng quan"
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
                        <div className="grid grid-cols-3">
                            {stats.map((item, idx) => (
                                <div key={idx} className="px-[12px]">
                                    <div className={`${item.bgColor} p-[20px] mb-[25px] rounded-[8px] ml-[25px] flex items-center`}>
                                        <div className={`w-[75px] h-[75px] mr-[30px] ${item.iconBg} text-white rounded-[8px] flex items-center justify-center ml-[-40px]`}>
                                            {item.icon}
                                        </div>
                                        <h3 className="text-[32px] font-[600]">
                                            {overviewLoading ? "..." : item.value}
                                            <span className="text-[#7d7b7b] font-[400] text-[16px] block">{item.label}</span>
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-[25px] flex">
                            <div className="w-[58.3%] px-[12px]">
                                <h3 className="text-[21px] text-client-secondary font-[600] mb-[15px]">Đơn hàng gần đây</h3>
                                <div className="border border-[#eee] rounded-[12px] overflow-hidden bg-white">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#F9F9F9] border-b border-[#eee]">
                                            <tr>
                                                <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Mã đơn</th>
                                                <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Ngày</th>
                                                <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Trạng thái</th>
                                                <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Tổng tiền</th>
                                                <th className="p-[20px] text-[15px] font-[600] text-client-secondary">Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#eee]">
                                            {overviewLoading ? (
                                                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Đang tải...</td></tr>
                                            ) : recentOrders.length === 0 ? (
                                                <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">Chưa có đơn hàng nào</td></tr>
                                            ) : recentOrders.map((order: any) => (
                                                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-[20px] text-[14px] text-client-secondary font-[600]">#{order.code}</td>
                                                    <td className="p-[20px] text-[14px] text-[#7d7b7b]">{dayjs(order.createdAt).format("DD/MM/YYYY")}</td>
                                                    <td className={`p-[20px] text-[14px] font-[700] ${getOrderStatusColor(order.orderStatus)}`}>
                                                        {getOrderStatusText(order.orderStatus)}
                                                    </td>
                                                    <td className="p-[20px] text-[14px] text-client-primary font-[700]">{formatCurrency(order.total)}</td>
                                                    <td className="p-[20px]">
                                                        <Link
                                                            to={`/dashboard/order/detail/${order._id}`}
                                                            className="inline-flex items-center justify-center px-4 py-1.5 bg-gray-100 hover:bg-client-primary hover:text-white rounded-full text-[12px] font-bold text-gray-600 transition-all uppercase"
                                                        >
                                                            Xem
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="flex-1 px-[12px]">
                                <h3 className="text-[21px] text-client-secondary font-[600] mb-[15px]">Đánh giá gần đây</h3>
                                <div className="border border-[#eee] rounded-[12px] p-[20px] bg-white h-full max-h-[480px] overflow-y-auto custom-scrollbar">
                                    {overviewLoading ? (
                                        <div className="py-10 text-center text-gray-400">Đang tải...</div>
                                    ) : recentReviews.length === 0 ? (
                                        <div className="py-10 text-center text-gray-400 italic">Chưa có đánh giá nào</div>
                                    ) : (
                                        <ul className="divide-y divide-[#eee]">
                                            {recentReviews.map((review: any, idx: number) => (
                                                <li key={idx} className={`${idx === 0 ? "pb-[20px]" : "py-[20px]"}`}>
                                                    <div className="flex justify-between items-start mb-[5px] gap-2">
                                                        <h4 className="text-[15px] font-[700] text-client-secondary line-clamp-1">{review.product?.name || "Sản phẩm"}</h4>
                                                        <div className="flex items-center gap-[1px] shrink-0">
                                                            {[...Array(5)].map((_, i) => (
                                                                <StarIcon
                                                                    key={i}
                                                                    sx={{
                                                                        fontSize: "14px !important",
                                                                        color: i < review.rating ? "#F9A61C !important" : "#eee !important",
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-[#7d7b7b] mb-[8px]">{dayjs(review.createdAt).format("DD/MM/YYYY HH:mm")}</p>
                                                    <p className="text-[#505050] text-[13px] line-clamp-2 italic leading-relaxed">
                                                        "{review.comment || "Không có nội dung"}"
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-[35px] px-[12px]">
                            <div className="rounded-[16px] border border-[#f1e4d6] bg-gradient-to-r from-[#fff7ef] to-[#fff] p-[22px]">
                                <div className="flex items-center justify-between mb-[12px]">
                                    <h3 className="text-[24px] font-secondary text-client-secondary">Khach san cua ban</h3>
                                    <Link
                                        to="/hotels"
                                        className="bg-client-primary text-white px-[18px] py-[8px] rounded-[999px] text-[13px] font-[700] hover:bg-client-secondary transition-default"
                                    >
                                        Dat them
                                    </Link>
                                </div>

                                {boardingLoading ? (
                                    <div className="text-[15px] text-[#637381]">Dang tai danh sach khach san...</div>
                                ) : boardingBookings.length === 0 ? (
                                    <div className="text-[15px] text-[#637381]">Ban chua co booking khach san nao.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                                        {boardingBookings.slice(0, 6).map((booking: any) => {
                                            const checkIn = booking?.checkInDate || booking?.startDate;
                                            const checkOut = booking?.checkOutDate || booking?.endDate;
                                            const status = getBoardingStatus(booking?.status || booking?.bookingStatus);
                                            const cage = booking?.cageId;
                                            const cageId = typeof cage === "string" ? cage : cage?._id;
                                            const cageCode = typeof cage === "string" ? "Phong" : cage?.cageCode || "Phong";

                                            return (
                                                <div key={booking?._id || `${booking?.code}-${checkIn}`} className="bg-white rounded-[12px] border border-[#f1e4d6] p-[14px]">
                                                    <div className="flex items-start justify-between gap-[10px]">
                                                        <div>
                                                            <div className="text-[13px] text-[#7d7b7b]">Ma booking</div>
                                                            <div className="text-[16px] font-[700] text-client-secondary">#{booking?.code || booking?._id?.slice(-6) || "N/A"}</div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[12px] font-[700] ${status.cls}`}>
                                                            {status.text}
                                                        </span>
                                                    </div>

                                                    <div className="mt-[12px] text-[14px] text-[#505050] space-y-[6px]">
                                                        <div><span className="text-[#7d7b7b]">Phong:</span> <span className="font-[600] text-client-secondary">{cageCode}</span></div>
                                                        <div><span className="text-[#7d7b7b]">Nhan:</span> {checkIn ? dayjs(checkIn).format("DD/MM/YYYY") : "-"}</div>
                                                        <div><span className="text-[#7d7b7b]">Tra:</span> {checkOut ? dayjs(checkOut).format("DD/MM/YYYY") : "-"}</div>
                                                        <div><span className="text-[#7d7b7b]">Tong tien:</span> <span className="font-[700] text-client-primary">{formatCurrency(booking?.totalPrice || booking?.total || 0)}</span></div>
                                                    </div>

                                                    {cageId && (
                                                        <Link
                                                            to={`/hotels/${cageId}`}
                                                            className="inline-flex mt-[12px] text-[13px] font-[700] text-client-primary hover:text-client-secondary transition-default"
                                                        >
                                                            Xem phong
                                                        </Link>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
