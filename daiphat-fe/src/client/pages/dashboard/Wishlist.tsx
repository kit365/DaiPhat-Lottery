import { Sidebar } from "./sections/Sidebar";
import { ProductBanner } from "../product/sections/ProductBanner";
import { useWishlistStore } from "../../../stores/useWishlistStore";
import { useCartStore } from "../../../stores/useCartStore";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Trash } from "iconoir-react";

export const WishlistPage = () => {
    const navigate = useNavigate();
    const { items, removeFromWishlist, updateQuantity } = useWishlistStore();
    const { addToCart } = useCartStore();

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Yêu thích", to: "/dashboard/wishlist" },
    ];

    const handleAddToCart = (item: any) => {
        if (item.detail.attributeList?.length > 0 && (!item.variant || item.variant.length === 0)) {
            toast.warning("Vui lòng chọn các thuộc tính trước khi thêm vào giỏ hàng!");
            navigate(`/product/detail/${item.detail.slug}`);
            return;
        }

        const cartItem = {
            productId: item.productId,
            quantity: item.quantity,
            checked: true,
            variant: item.variant,
            detail: item.detail
        };

        const success = addToCart(cartItem);
        if (success) {
            toast.success(`Đã thêm ${item.detail.name} vào giỏ hàng!`);
        }
    };

    return (
        <>
            <ProductBanner
                pageTitle="Yêu Thích"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                className="bg-top shadow-inner"
            />

            <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
                <div className="w-[25%] px-[12px] flex">
                    <Sidebar />
                </div>
                <div className="w-[75%] px-[12px]">
                    <div className="mt-[100px] p-[35px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[20px] overflow-hidden">
                        <h3 className="text-[24px] font-secondary text-client-secondary mb-[30px]">
                            Danh sách yêu thích của bạn
                        </h3>

                        {items.length > 0 ? (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[#f9f9f9] text-client-secondary font-secondary uppercase text-[14px]">
                                            <th className="py-[15px] px-[20px] text-left rounded-l-[15px]">Ảnh</th>
                                            <th className="py-[15px] px-[20px] text-left">Thông Tin</th>
                                            <th className="py-[15px] px-[20px] text-left">Đơn Giá</th>
                                            <th className="py-[15px] px-[20px] text-center">Số Lượng</th>
                                            <th className="py-[15px] px-[20px] text-left">Tạm Tính</th>
                                            <th className="py-[15px] px-[20px] text-center rounded-r-[15px]">Hành Động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => {
                                            const subtotal = item.detail.priceNew * item.quantity;
                                            return (
                                                <tr key={`${item.productId}-${index}`} className="border-b border-[#eee] last:border-0">
                                                    <td className="py-[25px] px-[20px]">
                                                        <Link to={`/product/detail/${item.detail.slug}`} className="block w-[100px] h-[100px] rounded-[15px] overflow-hidden border border-[#eee]">
                                                            <img src={item.detail.images[0]} alt="" className="w-full h-full object-cover" />
                                                        </Link>
                                                    </td>
                                                    <td className="py-[25px] px-[20px]">
                                                        <Link to={`/product/detail/${item.detail.slug}`} className="text-client-secondary hover:text-client-primary font-secondary text-[18px] transition-default block mb-1">
                                                            {item.detail.name}
                                                        </Link>
                                                        {item.variant && item.variant.length > 0 && (
                                                            <div className="text-[13px] text-gray-500">
                                                                {item.variant.map(v => v.label).join(", ")}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-[25px] px-[20px] font-secondary text-[#505050]">
                                                        {item.detail.priceNew.toLocaleString()}đ
                                                    </td>
                                                    <td className="py-[25px] px-[20px]">
                                                        <div className="flex items-center justify-center bg-[#f0f0f0] rounded-[30px] w-fit mx-auto overflow-hidden">
                                                            <button
                                                                onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variant)}
                                                                disabled={item.quantity <= 1}
                                                                className={`px-3 py-1 text-[18px] transition-colors ${item.quantity <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-client-primary cursor-pointer'}`}
                                                            >-</button>
                                                            <span className="w-[40px] text-center text-[14px] font-medium">{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variant)}
                                                                disabled={item.quantity >= item.detail.stock}
                                                                className={`px-3 py-1 text-[18px] transition-colors ${item.quantity >= item.detail.stock ? 'opacity-30 cursor-not-allowed' : 'hover:text-client-primary cursor-pointer'}`}
                                                            >+</button>
                                                        </div>
                                                    </td>
                                                    <td className="py-[25px] px-[20px] font-secondary text-client-primary font-bold">
                                                        {subtotal.toLocaleString()}đ
                                                    </td>
                                                    <td className="py-[25px] px-[20px] text-center">
                                                        <div className="flex flex-col gap-2 items-center">
                                                            <button
                                                                onClick={() => handleAddToCart(item)}
                                                                className="bg-client-secondary hover:bg-client-primary text-white font-secondary text-[13px] py-[8px] px-[20px] rounded-[30px] transition-all whitespace-nowrap cursor-pointer shadow-sm active:scale-95"
                                                            >
                                                                Thêm Vào Giỏ
                                                            </button>
                                                            <button
                                                                onClick={() => removeFromWishlist(item.productId, item.variant)}
                                                                className="flex items-center justify-center gap-1 bg-client-primary hover:bg-client-secondary text-white text-[12px] py-[6px] px-[15px] rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
                                                            >
                                                                <Trash className="w-[14px] h-[14px]" /> Xóa
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-[60px]">
                                <p className="text-gray-400 italic mb-6 text-[18px]">Bạn chưa có mục yêu thích nào.</p>
                                <Link to="/shop" className="bg-client-primary text-white font-secondary px-8 py-3 rounded-full hover:bg-client-secondary transition-all">
                                    Khám phá ngay
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
