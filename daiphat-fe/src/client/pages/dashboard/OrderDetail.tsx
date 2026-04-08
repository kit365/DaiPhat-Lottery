import { useState, useEffect, useRef } from "react";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import { useParams, Link } from "react-router-dom";
import { MessageText, Star, Xmark, NavArrowRight, MediaImage, Trash } from "iconoir-react";
import { getOrderDetail } from "../../api/dashboard.api";
import { formatCurrency } from "../../helpers";
import dayjs from "dayjs";

import { exportInvoicePdf, cancelOrder } from "../../api/order.api";
import { toast } from "react-toastify";
import { createReview } from "../../api/review.api";
import { useMutation } from "@tanstack/react-query";
import { uploadImagesToCloudinary } from "../../../admin/api/uploadCloudinary.api";
import { CancelModal } from "../../components/ui/CancelModal";

export const OrderDetailPage = () => {
    const { id } = useParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createReviewMutation = useMutation({
        mutationFn: createReview,
        onSuccess: (res: any) => {
            if (res.success) {
                toast.success(res.message || "Đánh giá thành công!");
                setIsModalOpen(false);
                setComment("");
                setRating(5);
                setImages([]);
                // Refresh order data
                fetchOrder();
            } else {
                toast.error(res.message || "Gửi đánh giá thất bại!");
            }
        },
        onError: () => {
            toast.error("Đã có lỗi xảy ra!");
        }
    });

    const fetchOrder = async () => {
        if (!id) return;
        try {
            const response = await getOrderDetail(id);
            if (response.success) {
                setOrder(response.order);
            }
        } catch (error) {
            console.error("Failed to fetch order detail:", error);
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: `Chi tiết đơn hàng`, to: `/dashboard/order/detail/${id}` },
    ];

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const handleOpenReview = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
        setRating(5);
        setComment("");
        setImages([]);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const uploadedUrls = await uploadImagesToCloudinary(Array.from(files));
            setImages(prev => [...prev, ...uploadedUrls]);
            toast.success("Tải ảnh lên thành công!");
        } catch (error) {
            toast.error("Lỗi khi tải ảnh lên!");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitReview = () => {
        if (!selectedItem) return;
        if (!comment.trim()) {
            toast.warn("Vui lòng nhập nhận xét!");
            return;
        }

        createReviewMutation.mutate({
            productId: selectedItem.productId,
            orderId: order._id,
            orderItemId: selectedItem._id,
            rating,
            comment,
            images,
            variant: selectedItem.variant
        });
    };

    const handleExportInvoice = async () => {
        if (!order) return;
        setExporting(true);
        try {
            const blob = await exportInvoicePdf(order.code, order.phone);

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${order.code}.pdf`);

            // Append to html link element page and click
            document.body.appendChild(link);
            link.click();

            // Clean up and remove the link
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
            toast.success("Đã tải xuống hóa đơn!");
        } catch (error) {
            console.error("Failed to export invoice:", error);
            toast.error("Xuất hóa đơn thất bại!");
        } finally {
            setExporting(false);
        }
    };

    const handleCancelOrder = () => {
        setIsCancelModalOpen(true);
    };

    const onConfirmCancel = async (reason: string) => {
        if (!id || !order) return;
        setIsCancelModalOpen(false);
        setIsCanceling(true);
        try {
            const res = await cancelOrder(id, reason);
            if (res.code === "success") {
                toast.success(res.message || "Hủy đơn hàng thành công!");
                fetchOrder();
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
            case "paid":
            case "shipped":
                return "text-[#05A845]";
            case "confirmed":
            case "shipping":
                return "text-[#007BFF]";
            case "pending":
            case "unpaid":
                return "text-[#f97316]";
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
            "delayed": "Trễ hẹn",
            "refunded": "Đã hoàn tiền",
            "request_cancel": "Chờ duyệt hủy/hoàn tiền"
        };
        return map[status] || status;
    };

    if (loading) return <div className="p-10 text-center text-[16px]">Đang tải...</div>;
    if (!order) return <div className="p-10 text-center text-[16px]">Không tìm thấy đơn hàng!</div>;

    return (
        <>
            <ProductBanner
                pageTitle={`Chi tiết đơn hàng`}
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
                                Chi tiết đơn hàng
                            </h3>
                            <Link className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[15px] font-[500] text-[14px] text-white flex items-center gap-[8px] cursor-pointer" to={"/dashboard/orders"}>
                                <span className="relative z-10">Trở lại</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </div>

                        {/* Order Stepper with Timestamps */}
                        <div className="mb-[60px] pt-[30px] pb-[40px] px-[20px] bg-[#fdfdfd] border border-[#f5f5f5] rounded-[24px] relative shadow-sm">
                            <div className="flex justify-between relative z-10 w-full max-w-[900px] mx-auto gap-4">
                                {[
                                    { key: "pending", label: "Chờ xác nhận", date: order.createdAt, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 18 4.5H6a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 6 18.75h.75m11.25-3V3.75m-11.25 15V6.75M12 9V3.75m-6 0h12" /></svg> },
                                    { key: "confirmed", label: "Đã xác nhận", date: order.confirmedAt, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" /></svg> },
                                    { key: "shipping", label: "Đang giao", date: order.shippingAt, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.806H14.25M16.5 18.75h-2.25m0-11.177V3.75M14.25 7.573V3.75M2.25 13.5h14.505a4.502 4.502 0 0 1 1.84.395m-14.505 0a1.121 1.121 0 0 0 1.121 1.132v.003h12.262" /></svg> },
                                    { key: "shipped", label: "Đã đến nơi", date: order.shippedAt, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg> },
                                    { key: "completed", label: "Hoàn thành", date: order.completedAt, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-[20px] h-[20px]"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg> },
                                ].map((step, index, arr) => {
                                    const successFlow = ["pending", "confirmed", "shipping", "shipped", "completed"];
                                    const isCancelled = order.orderStatus === "cancelled";
                                    const isReturned = order.orderStatus === "returned";

                                    const currentIndex = successFlow.indexOf(order.orderStatus);
                                    const isPast = currentIndex !== -1 && index < currentIndex;
                                    const isCurrent = currentIndex !== -1 && index === currentIndex;
                                    const isLast = index === arr.length - 1;

                                    let stepColorClass = "";
                                    let labelColorClass = "";

                                    if (isCancelled || isReturned) {
                                        const wasStepReached = index === 0 || (order.statusHistory || []).some((h: any) => h.status === step.key);
                                        stepColorClass = wasStepReached ? "bg-gradient-to-br from-gray-400 to-gray-600 text-white" : "bg-white text-gray-300 border-[2px] border-[#eee]";
                                        labelColorClass = wasStepReached ? "text-gray-600" : "text-gray-300";
                                    } else {
                                        if (isCurrent || isPast) {
                                            stepColorClass = "bg-gradient-to-br from-client-primary to-client-secondary text-white ring-4 ring-orange-50";
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
                                                        style={{ width: (isPast && !isCancelled && !isReturned) ? "100%" : "0%" }}
                                                    />
                                                </div>
                                            )}
                                            <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-500 shadow-md ${stepColorClass}`}>
                                                {step.icon}
                                            </div>
                                            <div className="mt-[15px] flex flex-col items-center min-h-[50px]">
                                                <span className={`text-[12px] font-[700] uppercase tracking-wider transition-colors duration-500 text-center ${labelColorClass}`}>
                                                    {step.label}
                                                </span>
                                                {step.date && (
                                                    <span className="text-[11px] text-gray-500 font-[500] mt-1 text-center whitespace-nowrap">
                                                        {dayjs(step.date).format("HH:mm DD/MM")}
                                                    </span>
                                                )}
                                                {isCurrent && step.key !== 'completed' && !isCancelled && !isReturned && (
                                                    <span className="text-[10px] text-orange-500 font-[600] animate-pulse mt-1">Đang thực hiện</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Special states for Cancelled/Returned at the end */}
                                {(order.orderStatus === "cancelled" || order.orderStatus === "returned") && (
                                    <div className="flex flex-col items-center flex-1 relative">
                                        <div className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-500 shadow-md bg-gradient-to-br ${order.orderStatus === "cancelled" ? "from-red-500 to-red-700" : "from-yellow-500 to-yellow-700"} text-white ring-4 ring-red-50`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-[24px] h-[24px]">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <div className="mt-[15px] flex flex-col items-center">
                                            <span className="text-[12px] font-[800] uppercase tracking-wider text-red-600 text-center">
                                                {order.orderStatus === "cancelled" ? "Đã hủy đơn" : "Đã trả hàng"}
                                            </span>
                                            <span className="text-[11px] text-red-400 font-[500] mt-1 text-center whitespace-nowrap">
                                                {dayjs(order.cancelledAt || order.returnedAt || order.updatedAt).format("HH:mm DD/MM")}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="">
                            <div className="border border-[#eee] rounded-[12px] w-full">
                                <div className="flex justify-between items-center p-[30px] mb-[40px]">
                                    <div className="flex items-center gap-[15px]">
                                        <img src="https://i.imgur.com/V2kwkkK.png" alt="" className="w-[150px]" />
                                    </div>
                                    <div className="">
                                        <h2 className="uppercase text-[22px] text-client-secondary font-[700] mb-[15px]">Hóa đơn</h2>
                                        <p className="text-[#7d7b7b] text-[15px] mb-[5px]">Mã đơn hàng: #{order.code}</p>
                                        <p className="text-[#7d7b7b] text-[15px] mb-[5px]">Ngày: {dayjs(order.createdAt).format("DD-MM-YYYY HH:mm")}</p>
                                        <div className="flex flex-col gap-[5px] mb-[20px]">
                                            <p className="text-[15px] flex items-center gap-[5px]">
                                                <span className="text-[#7d7b7b]">Trạng thái đơn: </span>
                                                <span className={`font-[500] ${getStatusColor(order.orderStatus)}`}>{getStatusText(order.orderStatus)}</span>
                                            </p>
                                            <p className="text-[15px] flex items-center gap-[5px]">
                                                <span className="text-[#7d7b7b]">Thanh toán: </span>
                                                <span className={`font-[500] ${getStatusColor(order.paymentStatus)}`}>{getStatusText(order.paymentStatus)}</span>
                                            </p>
                                            {(order.orderStatus === "cancelled" || order.orderStatus === "returned") && (
                                                <p className="text-[14px] bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 mt-2">
                                                    <span className="font-bold">Lý do {order.orderStatus === "cancelled" ? "hủy" : "trả hàng"}:</span> {order.cancelledReason || "Theo yêu cầu của khách hàng"}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={handleExportInvoice}
                                                disabled={exporting}
                                                className="bg-client-primary hover:bg-client-secondary transition-default text-white font-[600] text-[14px] py-[15px] px-[25px] rounded-[6px] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 w-full"
                                            >
                                                {exporting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                                Xuất hóa đơn
                                            </button>



                                            {(order.orderStatus === "pending" || order.orderStatus === "confirmed") && (
                                                <button
                                                    onClick={handleCancelOrder}
                                                    disabled={isCanceling}
                                                    className="bg-red-500 hover:bg-red-600 transition-default text-white font-[600] text-[14px] py-[15px] px-[25px] rounded-[6px] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 w-full"
                                                >
                                                    {isCanceling && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                                    Hủy đơn hàng
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#F9F9F9] border-y border-[#eee]">
                                            <th className="py-[15px] px-[20px] text-[16px] font-[600] text-client-secondary border-r border-[#eee]">Tên sản phẩm</th>
                                            <th className="py-[15px] px-[20px] text-[16px] font-[600] text-client-secondary border-r border-[#eee]">Giá</th>
                                            <th className="py-[15px] px-[20px] text-[16px] font-[600] text-client-secondary border-r border-[#eee] text-center">Số lượng</th>
                                            <th className="py-[15px] px-[20px] text-[16px] font-[600] text-client-secondary">Tổng cộng</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee] border-b border-[#eee]">
                                        {order.items?.map((item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="py-[15px] px-[20px] text-[15px] text-[#7d7b7b] border-r border-[#eee] underline cursor-pointer hover:text-client-primary transition-colors">{item.name || "Sản phẩm"}</td>
                                                <td className="py-[15px] px-[20px] text-[15px] text-[#7d7b7b] border-r border-[#eee]">{formatCurrency(item.price)}</td>
                                                <td className="py-[15px] px-[20px] text-[15px] text-[#7d7b7b] border-r border-[#eee] text-center">{item.quantity}</td>
                                                <td className="py-[15px] px-[20px] text-[15px] text-[#7d7b7b]">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span>{formatCurrency(item.price * item.quantity)}</span>
                                                        {order.orderStatus === "completed" && (
                                                            item.reviewed ? (
                                                                <div className="flex items-center gap-[5px] text-[#05A845] font-[500] text-[14px]">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-[16px] h-[16px]">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                                    </svg>
                                                                    <span>{item.reviewStatus === 'pending' ? 'Đã gửi (Chờ duyệt)' : 'Đã đánh giá'}</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenReview(item)}
                                                                    className="flex items-center gap-[5px] transition-colors font-[500] group cursor-pointer"
                                                                >
                                                                    <MessageText className="w-[16px] h-[16px] text-client-primary" />
                                                                    <span className="text-client-secondary group-hover:text-client-primary transition-colors text-[14px]">Viết đánh giá</span>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="pt-[60px] px-[30px] pb-[30px]">
                                    <h3 className="text-[18px] font-[700] text-client-secondary mb-[15px]">Thông tin thanh toán</h3>
                                    <div className="space-y-[8px]">
                                        <p className="text-[15px] text-[#7d7b7b] flex gap-[10px]"><span className="text-client-secondary font-[600] min-w-[100px]">Họ tên:</span> {order.fullName}</p>
                                        <p className="text-[15px] text-[#7d7b7b] flex gap-[10px]"><span className="text-client-secondary font-[600] min-w-[100px]">Địa chỉ:</span> {order.address}</p>
                                        <p className="text-[15px] text-[#7d7b7b] flex gap-[10px]"><span className="text-client-secondary font-[600] min-w-[100px]">SĐT:</span> {order.phone}</p>
                                        <p className="text-[15px] text-[#7d7b7b] flex gap-[10px]"><span className="text-client-secondary font-[600] min-w-[100px]">Phương thức:</span> {order.paymentMethod === "cod" || order.paymentMethod === "money" ? "Thanh toán khi nhận hàng" : order.paymentMethod}</p>
                                        <p className="text-[15px] text-[#7d7b7b] flex gap-[10px]"><span className="text-client-secondary font-[600] min-w-[100px]">Tổng tiền:</span> {formatCurrency(order.total)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-[20px] bg-black/50 backdrop-blur-[2px]">
                    <div className="bg-white w-full max-w-[700px] rounded-[15px] shadow-[0px_20px_60px_rgba(0,0,0,0.15)] relative overflow-visible">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute -top-[15px] -right-[15px] w-[35px] h-[35px] bg-[#E1554E] text-white flex items-center justify-center rounded-[8px] hover:bg-[#c94b45] transition-colors shadow-lg z-10 cursor-pointer"
                        >
                            <Xmark strokeWidth={3} className="w-[18px] h-[18px]" />
                        </button>

                        <div className="w-full p-[40px]">
                            <h2 className="text-[26px] font-[700] text-client-secondary mb-[25px]">Đánh giá sản phẩm</h2>

                            {/* Star Rating */}
                            <div className="flex items-center gap-[15px] mb-[25px]">
                                <span className="text-[15px] text-[#777] font-[500]">Đánh giá của bạn:</span>
                                <div className="flex gap-[5px]">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className="transition-transform active:scale-90 cursor-pointer"
                                        >
                                            <Star
                                                className={`w-[22px] h-[22px] ${star <= rating ? "fill-[#F9A61C] text-[#F9A61C]" : "text-gray-300"}`}
                                                strokeWidth={2}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comment Textarea */}
                            <div className="relative mb-[25px]">
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Sản phẩm xịn lắm..."
                                    className="w-full h-[150px] p-[20px] border border-[#eee] rounded-[10px] text-[15px] text-[#333] outline-none transition-all resize-none focus:border-client-primary bg-[#fcfcfc]"
                                />
                            </div>

                            {/* Image Selection & Previews */}
                            <div className="flex flex-wrap gap-[15px] mb-[30px]">
                                {images.map((img, index) => (
                                    <div key={index} className="relative w-[80px] h-[80px] rounded-[10px] border border-[#eee] overflow-hidden group">
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-[3px] right-[3px] bg-red-500 text-white p-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <Trash className="w-[12px] h-[12px]" />
                                        </button>
                                    </div>
                                ))}

                                {images.length < 5 && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-[80px] h-[80px] border-[2px] border-dashed border-[#ddd] rounded-[10px] flex flex-col items-center justify-center text-[#999] cursor-pointer hover:border-client-primary hover:text-client-primary transition-all bg-gray-50"
                                    >
                                        {isUploading ? (
                                            <div className="w-6 h-6 border-2 border-client-primary border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <MediaImage className="w-[24px] h-[24px]" strokeWidth={1.5} />
                                                <span className="text-[11px] mt-1">Thêm ảnh</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    multiple
                                    hidden
                                    accept="image/*"
                                />
                            </div>

                            {/* Nút Gửi */}
                            <button
                                onClick={handleSubmitReview}
                                disabled={createReviewMutation.isPending || isUploading}
                                className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[35px] py-[15px] font-[600] text-[15px] text-white flex items-center gap-[10px] cursor-pointer transition-all disabled:opacity-50"
                            >
                                <span className="relative z-10">
                                    {createReviewMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
                                </span>
                                <NavArrowRight strokeWidth={3} className="relative z-10 w-[16px] h-[16px] transition-transform duration-300 rotate-[-45deg] group-hover:rotate-0" />
                                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CancelModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={onConfirmCancel}
                paymentStatus={order?.paymentStatus}
            />
        </>
    );
};