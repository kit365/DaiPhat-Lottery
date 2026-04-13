import { useState, useEffect } from "react";
import { ProductBanner } from "../product/sections/ProductBanner";
import { FooterSub } from "../../components/layouts/FooterSub";
import { useCartStore, CartVariant } from "../../../stores/useCartStore";
import { useAuthStore } from "../../../stores/useAuthStore";
import { CartEmpty } from "./sections/CartEmpty";
import { Link } from "react-router-dom";
import { getCartDetails } from "../../api/cart.api";
import { toast } from "react-toastify";

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Giỏ hàng", to: "/cart" },
];

export const CartPage = () => {
    const items = useCartStore((state) => state.items);
    const removeFromCart = useCartStore((state) => state.removeFromCart);
    const updateQuantity = useCartStore((state) => state.updateQuantity);
    const toggleCheck = useCartStore((state) => state.toggleCheck);
    const toggleAll = useCartStore((state) => state.toggleAll);
    const syncCart = useCartStore((state) => state.syncCart);
    const totalAmount = useCartStore((state) => state.totalAmount());

    const [loading, setLoading] = useState(true);
    const [removingItems, setRemovingItems] = useState<string[]>([]);
    const [pointInfo, setPointInfo] = useState<{ canUsePoint: number, POINT_TO_MONEY: number } | null>(null);

    // Đồng bộ giỏ hàng từ API khi vào trang
    useEffect(() => {
        const fetchLatestCart = async () => {
            if (items.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const cartDataForSync = items.map(item => ({
                    productId: item.productId,
                    variant: item.variant,
                    quantity: item.quantity,
                    checked: item.checked
                }));

                const response = await getCartDetails(cartDataForSync);
                if (response.code === "success") {
                    syncCart(response.cart);
                    if (response.canUsePoint !== undefined) {
                        setPointInfo({
                            canUsePoint: response.canUsePoint,
                            POINT_TO_MONEY: response.POINT_TO_MONEY
                        });

                        // Sync to AuthStore
                        const currentUser = useAuthStore.getState().user;
                        if (currentUser) {
                            useAuthStore.getState().set({
                                user: {
                                    ...currentUser,
                                    totalPoint: response.totalPoint,
                                    usedPoint: response.usedPoint
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Lỗi đồng bộ giỏ hàng:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLatestCart();
    }, []);

    const handleRemove = (productId: string, variant?: CartVariant[]) => {
        const itemKey = `${productId}-${JSON.stringify(variant)}`;
        setRemovingItems((prev) => [...prev, itemKey]);
        setTimeout(() => {
            removeFromCart(productId, variant);
            setRemovingItems((prev) => prev.filter((key) => key !== itemKey));
            toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
        }, 300);
    };

    const handleUpdateQuantity = (productId: string, newQty: number, maxStock: number, variant?: CartVariant[]) => {
        if (newQty > maxStock) {
            toast.warning(`Chỉ còn ${maxStock} sản phẩm trong kho`);
            updateQuantity(productId, maxStock, variant);
        } else {
            updateQuantity(productId, newQty, variant);
        }
    };



    if (loading && items.length > 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-[20px] font-secondary text-client-primary animate-pulse">Đang cập nhật giỏ hàng...</div>
            </div>
        );
    }

    const isAllChecked = items.length > 0 && items.every(item => item.checked);

    return (
        <>
            <ProductBanner
                pageTitle="Giỏ hàng"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-listing.jpg"
                className="bg-top"
            />

            {items.length > 0 ? (
                <div className="app-container flex items-start pb-[150px] 2xl:pb-[100px] relative">
                    <div className="w-[65%] bg-white rounded-[20px] border border-[#d7d7d7] overflow-hidden mx-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="w-full text-[20px] font-secondary text-white bg-client-primary">
                                    <th className="w-[80px] border-r border-[#d7d7d7] py-[10px] px-[20px]">
                                        <div className="checkbox flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                id="selectAll"
                                                hidden
                                                checked={isAllChecked}
                                                onChange={() => toggleAll()}
                                            />
                                            <label htmlFor="selectAll" className="cursor-pointer translate-x-[5px]"></label>
                                        </div>
                                    </th>
                                    <th className="w-[26%] border-r border-[#d7d7d7] py-[10px] px-[20px]">
                                        Sản phẩm
                                    </th>
                                    <th className="border-r border-[#d7d7d7] py-[10px] px-[20px]">
                                        Chi tiết
                                    </th>
                                    <th className="w-[150px] py-[10px] px-[20px]">Tổng</th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.map((item, index) => {
                                    const itemKey = `${item.productId}-${JSON.stringify(item.variant)}`;
                                    const isRemoving = removingItems.includes(itemKey);
                                    const maxStock = item.detail.stock;

                                    return (
                                        <tr
                                            key={itemKey}
                                            className={`border-t border-[#d7d7d7] transition-opacity duration-300 ${isRemoving ? "opacity-0" : "opacity-100"
                                                }`}
                                        >
                                            <td className="w-[80px] border-r border-[#d7d7d7] py-[20px] px-[20px]">
                                                <div className="checkbox flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`checkbox-${index}`}
                                                        hidden
                                                        checked={item.checked}
                                                        onChange={() => toggleCheck(item.productId, item.variant)}
                                                    />
                                                    <label htmlFor={`checkbox-${index}`} className="cursor-pointer translate-x-[5px]"></label>
                                                </div>
                                            </td>
                                            <td className="w-[26%] border-r border-[#d7d7d7] py-[20px] px-[30px]">
                                                <img
                                                    className="w-[206px] h-[216px] 2xl:w-[170px] 2xl:h-[179px] object-cover rounded-[10px]"
                                                    src={item.detail.images[0]}
                                                    alt={item.detail.name}
                                                />
                                            </td>

                                            <td className="border-r border-[#d7d7d7] py-[30px] px-[20px]">
                                                <div className="text-center">
                                                    <Link
                                                        to={`/product/detail/${item.detail.slug}`}
                                                        className="mb-[20px] block text-[20px] font-secondary"
                                                    >
                                                        {item.detail.name}
                                                    </Link>

                                                    <p className="text-[#505050] mb-[20px] 2xl:mb-[15px]">
                                                        {item.detail.priceNew.toLocaleString()}đ
                                                    </p>

                                                    <p className="text-client-text mb-[20px] 2xl:mb-[15px]">
                                                        <span className="font-secondary 2xl:text-[14px] text-client-secondary mr-[5px]">
                                                            Phân loại:
                                                        </span>
                                                        {item.variant && item.variant.length > 0
                                                            ? item.variant.map(v => {
                                                                const attrName = item.detail.attributeList?.find(a => a._id === v.attrId)?.name || "";
                                                                return attrName ? `${attrName}: ${v.label}` : v.label;
                                                            }).join(", ")
                                                            : "Mặc định"}
                                                    </p>

                                                    {/* Tăng giảm số lượng */}
                                                    <div className="flex items-center justify-center gap-[20px] h-[48px] 2xl:h-[48px]">
                                                        <div className="text-[#505050] flex items-center h-full">
                                                            <input
                                                                type="button"
                                                                value="-"
                                                                disabled={item.quantity <= 1}
                                                                onClick={() =>
                                                                    handleUpdateQuantity(
                                                                        item.productId,
                                                                        item.quantity - 1,
                                                                        maxStock,
                                                                        item.variant
                                                                    )
                                                                }
                                                                className={`w-[40px] h-full rounded-l-[40px] text-[20px] bg-[#e67e2033] text-center transition-[color] duration-200 ease-linear ${item.quantity <= 1
                                                                    ? "cursor-not-allowed"
                                                                    : "cursor-pointer hover:text-client-primary"
                                                                    }`}
                                                            />
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                readOnly
                                                                value={item.quantity}
                                                                className="w-[40px] h-full bg-[#e67e2033] text-[16px] text-center outline-none no-spinner"
                                                            />
                                                            <input
                                                                type="button"
                                                                value="+"
                                                                disabled={item.quantity >= maxStock}
                                                                onClick={() =>
                                                                    handleUpdateQuantity(
                                                                        item.productId,
                                                                        item.quantity + 1,
                                                                        maxStock,
                                                                        item.variant
                                                                    )
                                                                }
                                                                className={`w-[40px] h-full rounded-r-[40px] text-[20px] bg-[#e67e2033] text-center transition-[color] duration-200 ease-linear ${item.quantity >= maxStock
                                                                    ? "cursor-not-allowed"
                                                                    : "cursor-pointer hover:text-client-primary"
                                                                    }`}
                                                            />
                                                        </div>

                                                        {/* Nút xóa sản phẩm */}
                                                        <button
                                                            onClick={() => handleRemove(item.productId, item.variant)}
                                                            disabled={isRemoving}
                                                            className="h-full flex items-center justify-center px-[30px] bg-client-primary rounded-[40px] text-white font-[500] hover:bg-client-secondary transition-default cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Xóa sản phẩm
                                                        </button>
                                                    </div>
                                                    {maxStock <= 5 && maxStock > 0 && (
                                                        <p className="text-red-500 text-[13px] mt-[10px]">Chỉ còn lại {maxStock} sản phẩm!</p>
                                                    )}
                                                    {maxStock === 0 && (
                                                        <p className="text-red-600 font-bold text-[14px] mt-[10px]">Sản phẩm đã hết hàng!</p>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="w-[150px] text-center font-bold text-client-secondary">
                                                {(item.detail.priceNew * item.quantity).toLocaleString()}đ
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex-1 ml-[50px]">
                        <div className="sticky top-[20px] overflow-hidden border border-[#d7d7d7] bg-white rounded-[20px]">
                            <h2 className="py-[10px] px-[20px] text-[20px] font-secondary text-white bg-client-primary text-center">Tóm tắt đơn hàng</h2>

                            <div className="p-[25px]">
                                {/* Danh sách sản phẩm đã chọn - Kiểu Billing Summary */}
                                <div className="max-h-[350px] overflow-y-auto pr-[10px] mb-[25px] custom-scrollbar border-b border-[#eee] pb-[10px]">
                                    {items.filter(item => item.checked).length > 0 ? (
                                        items.filter(item => item.checked).map((item, idx) => (
                                            <div key={idx} className="flex gap-[15px] mb-[20px] last:mb-[10px]">
                                                <div className="w-[70px] h-[70px] shrink-0 rounded-[12px] overflow-hidden border border-[#f0f0f0] bg-[#fafafa]">
                                                    <img src={item.detail.images[0]} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[15px] font-secondary text-client-secondary truncate mb-[4px]">{item.detail.name}</h4>
                                                    <div className="flex justify-between items-center text-[14px]">
                                                        <span className="text-client-text opacity-70">
                                                            {item.detail.priceNew.toLocaleString()}đ × {item.quantity}
                                                        </span>
                                                        <span className="font-bold text-client-secondary">
                                                            {(item.detail.priceNew * item.quantity).toLocaleString()}đ
                                                        </span>
                                                    </div>
                                                    {item.variant && item.variant.length > 0 && (
                                                        <p className="text-[12px] text-[#999] mt-[4px] italic">
                                                            {item.variant.map(v => {
                                                                const attrName = item.detail.attributeList?.find(a => a._id === v.attrId)?.name || "";
                                                                return attrName ? `${attrName}: ${v.label}` : v.label;
                                                            }).join(", ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-[30px] text-center text-[#999] italic text-[14px]">
                                            Chưa có sản phẩm nào được chọn
                                        </div>
                                    )}
                                </div>

                                {/* Chi tiết tiền tệ */}
                                <div className="space-y-[12px] mb-[25px]">
                                    <div className="flex justify-between text-[15px] text-client-text">
                                        <span>Tạm tính</span>
                                        <span>{totalAmount.toLocaleString()}đ</span>
                                    </div>
                                    <div className="pt-[15px] border-t-2 border-dashed border-[#eee] flex justify-between items-center">
                                        <span className="text-[18px] font-secondary text-client-secondary">Tổng thanh toán</span>
                                        <span className="text-[22px] font-bold text-client-primary">{totalAmount.toLocaleString()}đ</span>
                                    </div>
                                </div>

                                {pointInfo && pointInfo.canUsePoint > 0 && (
                                    <div className="mt-[15px] p-[15px] bg-client-primary/5 rounded-[12px] border border-client-primary/10">
                                        <div className="flex items-center gap-[8px] mb-[4px]">
                                            <span className="text-[18px]">💎</span>
                                            <span className="text-[14px] font-bold text-client-secondary">Điểm thưởng hiện có</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className="text-[20px] font-black text-client-primary">{pointInfo.canUsePoint.toLocaleString()}</span>
                                                <span className="text-[12px] text-client-text ml-[4px] font-medium">điểm</span>
                                            </div>
                                            <div className="text-[11px] text-gray-500 italic">
                                                ≈ {(pointInfo.canUsePoint * pointInfo.POINT_TO_MONEY).toLocaleString()}đ
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-[8px]">Dùng điểm để được giảm giá khi thanh toán</p>
                                    </div>
                                )}
                                <div className="text-center mt-[15px]">
                                    <Link
                                        to={items.some(item => item.checked) ? "/checkout" : "#"}
                                        onClick={(e) => {
                                            if (!items.some(item => item.checked)) {
                                                e.preventDefault();
                                                toast.info("Vui lòng chọn ít nhất một sản phẩm");
                                            }
                                        }}
                                        className={`w-full py-[16px] px-[30px] text-white font-secondary inline-block rounded-[50px] transition-all duration-300 text-center shadow-none ${items.some(item => item.checked)
                                            ? "bg-client-primary hover:bg-client-secondary hover:shadow-none"
                                            : "bg-gray-300 cursor-not-allowed"
                                            }`}
                                    >
                                        Tiến hành thanh toán
                                    </Link>
                                    <p className="text-[12px] text-[#888] mt-[15px] italic">Nhấn thanh toán để hoàn tất đơn hàng</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <CartEmpty />
            )}

            <FooterSub />
        </>
    );
};
