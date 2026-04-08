import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FooterSub } from "../../components/layouts/FooterSub";
import { ProductBanner } from "../product/sections/ProductBanner";
import { getOrderSuccess } from "../../api/order.api";
import dayjs from "dayjs";

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Đặt hàng thành công", to: "/order/success" },
];

export const CheckSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderCode = searchParams.get("orderCode");
    const phone = searchParams.get("phone");
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderCode || !phone) {
                navigate("/");
                return;
            }
            try {
                const response = await getOrderSuccess(orderCode, phone);
                if (response.code === "success") {
                    setOrder(response.order);
                } else {
                    navigate("/");
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin đơn hàng:", error);
                navigate("/");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderCode, phone, navigate]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-[20px]">Đang tải...</div>;
    }

    if (!order) return null;

    return (
        <>
            <ProductBanner
                pageTitle="Thanh toán"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-listing.jpg"
                className="bg-top"
            />
            <div className="app-container pb-[150px] 2xl:pb-[100px] relative">
                <div className="border-l-[5px] w-full mb-[30px] border-l-[#3db44c] bg-white px-[30px] py-[20px] text-client-text shadow-[0_0_3px_#10293726]">
                    Cảm ơn bạn. Đơn hàng của bạn đã được nhận.
                </div>
                <div className="mb-[48px] grid grid-cols-4 border border-[#10293726] p-[25px]">
                    <div className="text-[14px] text-client-text text-center border-r border-dashed border-[#cfc8d8] px-[12px] my-[10px]">
                        <div className="">Số đơn hàng:</div>
                        <div className="mt-[8px] font-bold">{order.code}</div>
                    </div>
                    <div className="text-[14px] text-client-text text-center border-r border-dashed border-[#cfc8d8] px-[12px] my-[10px]">
                        <div className="">Ngày:</div>
                        <div className="mt-[8px] font-bold">{dayjs(order.createdAt).format("DD/MM/YYYY")}</div>
                    </div>
                    <div className="text-[14px] text-client-text text-center border-r border-dashed border-[#cfc8d8] px-[12px] my-[10px]">
                        <div className="">Tổng cộng:</div>
                        <div className="mt-[8px] font-bold">{order.total.toLocaleString()}đ</div>
                    </div>
                    <div className="text-[14px] text-client-text text-center px-[12px] my-[10px]">
                        <div className="">Phương thức thanh toán:</div>
                        <div className="mt-[8px] font-bold">
                            {order.paymentMethod === "money" ? "Thanh toán khi nhận hàng" : order.paymentMethod.toUpperCase()}
                        </div>
                    </div>
                </div>
                <div className="mb-[50px]">
                    <p className="text-client-text mb-[12px]">
                        {order.paymentMethod === "money" ? "Thanh toán bằng tiền mặt khi nhận hàng." : "Thanh toán qua ví điện tử."}
                    </p>
                    <section className="border-[2px] border-[#10293726] mb-[50px] p-[60px]">
                        <h2 className="text-[18px] text-client-secondary font-secondary mb-[20px]">Chi tiết đơn hàng</h2>
                        <table className="w-full">
                            <thead className="w-full">
                                <tr>
                                    <th className="w-[66%] text-left py-[20px] border-b border-[#d7d7d7]">Sản phẩm:</th>
                                    <th className="w-[34%] text-right py-[20px] border-b border-[#d7d7d7]">Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="w-full">
                                {order.items.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td className="w-[66%] text-left py-[20px] border-b border-[#d7d7d7] text-client-text font-[600]">
                                            {item.name} {item.variant && item.variant.length > 0 ? `- ${item.variant.join(", ")}` : ""} x {item.quantity}
                                        </td>
                                        <td className="w-[34%] text-right py-[20px] border-b border-[#d7d7d7]">
                                            {(item.price * item.quantity).toLocaleString()}đ
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="w-full">
                                <tr>
                                    <td className="w-[66%] text-left py-[20px] border-b border-[#d7d7d7] font-[600]">Tạm tính:</td>
                                    <td className="w-[34%] text-right py-[20px] border-b border-[#d7d7d7]">{order.subTotal.toLocaleString()}đ</td>
                                </tr>
                                {order.discount > 0 && (
                                    <tr>
                                        <td className="w-[66%] text-left py-[20px] border-b border-[#d7d7d7] font-[600]">Giảm giá {order.coupon ? `(${order.coupon})` : ""}:</td>
                                        <td className="w-[34%] text-right py-[20px] border-b border-[#d7d7d7] text-green-600">-{order.discount.toLocaleString()}đ</td>
                                    </tr>
                                )}
                                {order.pointDiscount > 0 && (
                                    <tr>
                                        <td className="w-[66%] text-left py-[20px] border-b border-[#d7d7d7] font-[600]">💎 Điểm thưởng ({order.usedPoint.toLocaleString()} điểm):</td>
                                        <td className="w-[34%] text-right py-[20px] border-b border-[#d7d7d7] text-green-600">-{order.pointDiscount.toLocaleString()}đ</td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="w-[66%] text-left py-[20px] border-b border-[#d7d7d7] font-[600]">Phí vận chuyển ({order.shipping?.carrierName}):</td>
                                    <td className="w-[34%] text-right py-[20px] border-b border-[#d7d7d7]">+{order.shipping?.fee.toLocaleString()}đ</td>
                                </tr>
                                <tr>
                                    <td className="w-[66%] text-left py-[20px] border-b border-[#d7d7d7] font-[600]">Tổng cộng:</td>
                                    <td className="w-[34%] text-right py-[20px] border-b border-[#d7d7d7] text-client-primary font-bold text-[18px]">{order.total.toLocaleString()}đ</td>
                                </tr>
                                <tr>
                                    <td className="w-[66%] text-left py-[20px] font-[600]">Phương thức thanh toán:</td>
                                    <td className="w-[34%] text-right py-[20px]">
                                        {order.paymentMethod === "money" ? "Thanh toán khi nhận hàng" : order.paymentMethod.toUpperCase()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>
                    <section className="border-[2px] border-dashed border-[#10293726] p-[20px]">
                        <h2 className="text-[18px] font-secondary mb-[20px]">Thông tin nhận hàng</h2>
                        <div className="text-client-text flex flex-col gap-[10px]">
                            <div className="flex items-center">
                                <span className="font-bold min-w-[120px]">Họ tên:</span>
                                <p className="ml-[10px]">{order.fullName}</p>
                            </div>
                            <div className="flex items-center">
                                <span className="font-bold min-w-[120px]">Số điện thoại:</span>
                                <p className="ml-[10px]">{order.phone}</p>
                            </div>
                            <div className="flex items-center">
                                <span className="font-bold min-w-[120px]">Địa chỉ:</span>
                                <p className="ml-[10px]">{order.address}</p>
                            </div>
                            {order.note && (
                                <div className="flex flex-col mt-[10px] pt-[10px] border-t border-dashed border-gray-200">
                                    <span className="font-bold">Ghi chú:</span>
                                    <p className="mt-[5px] text-gray-500 italic">"{order.note}"</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
            <FooterSub />
        </>
    );
};