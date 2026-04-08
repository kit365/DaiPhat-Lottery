import { useParams, useNavigate } from "react-router-dom"
import React, { useEffect, useState, useMemo } from "react";
import StarIcon from "@mui/icons-material/Star";
import { Heart, UserCart, EyeSolid } from "iconoir-react";
import { ProductBanner } from "./sections/ProductBanner";
import { ProductGallery } from "./sections/ProductGallery";
import { ProductDesc } from "./sections/ProductDesc";
import { ProductComment } from "./sections/ProductComment";
import { ProductRelated } from "./sections/ProductRelated";
import { FooterSub } from "../../components/layouts/FooterSub";
import { useCartStore, CartItem } from "../../../stores/useCartStore";
import { useProductDetail } from "../../hooks/useProduct";
import { Typography, Skeleton } from "@mui/material";
import { useProductReviews } from "../../hooks/useProductReviews";
import { useWishlistStore } from "../../../stores/useWishlistStore";
import { toast } from "react-toastify";

export const ProductDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { data: productData, isLoading, error } = useProductDetail(slug || "");
    const { avgRating, totalReviews } = useProductReviews(productData?.productDetail?._id || "");

    const product = productData?.productDetail;
    const attributeList = productData?.attributeList || [];

    useEffect(() => {
        if (productData) {
            console.log("Dữ liệu chi tiết sản phẩm:", productData);
        }
    }, [productData]);

    // Tính toán khoảng giá từ dữ liệu thật
    const priceRange = useMemo(() => {
        if (!product) return "0đ";

        if (product.variants && product.variants.length > 0) {
            const prices = product.variants.filter((v: any) => v.status).map((v: any) => parseInt(v.priceNew));
            if (prices.length === 0) return `${(product.priceNew || 0).toLocaleString("vi-VN")}đ`;

            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            if (minPrice === maxPrice) {
                return `${minPrice.toLocaleString("vi-VN")}đ`;
            }
            return `${minPrice.toLocaleString("vi-VN")}đ - ${maxPrice.toLocaleString("vi-VN")}đ`;
        }

        return `${(product.priceNew || 0).toLocaleString("vi-VN")}đ`;
    }, [product]);

    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [showToast, setShowToast] = useState(false);

    const addToCart = useCartStore((state) => state.addToCart);
    const { toggleWishlist, isInWishlist } = useWishlistStore();

    // Xác định variant hiện tại dựa trên các option đã chọn
    const currentVariant = useMemo(() => {
        if (!product || !product.variants) return null;

        // Nếu sản phẩm không có thuộc tính nào thì không xét variant (hoặc variant rỗng)
        if (attributeList.length === 0) return null;

        return product.variants.find((v: any) => {
            if (!v.status) return false;
            // Kiểm tra xem tất cả các thuộc tính của variant có khớp với option đã chọn không
            return v.attributeValue.every((attr: any) => {
                return selectedOptions[attr.attrId] === attr.value;
            });
        });
    }, [product, selectedOptions, attributeList]);

    const maxStock = useMemo(() => {
        if (currentVariant) {
            return Math.max(0, parseInt(currentVariant.stock) || 0);
        }
        return Math.max(0, product?.stock || 0);
    }, [currentVariant, product]);

    const [quantity, setQuantity] = useState(1);

    // Reset số lượng về 1 khi đổi biến thể
    useEffect(() => {
        if (maxStock > 0) {
            setQuantity(1);
        } else {
            setQuantity(0);
        }
    }, [currentVariant, product]);



    const canAddToCart = useMemo(() => {
        if (!product) return false;
        if (attributeList.length === 0) return true; // Không có thuộc tính thì cho add
        return Object.keys(selectedOptions).length === attributeList.length; // Phải chọn đủ các thuộc tính
    }, [product, selectedOptions, attributeList]);

    const handleAddToCart = () => {
        if (!product || !canAddToCart) return;

        const cartItem: CartItem = {
            productId: product._id,
            quantity: quantity,
            checked: true,
            variant: currentVariant ? currentVariant.attributeValue : undefined,
            detail: {
                images: product.images || [],
                slug: product.slug,
                name: product.name,
                priceNew: currentVariant ? parseInt(currentVariant.priceNew) : (product.priceNew || 0),
                priceOld: currentVariant ? parseInt(currentVariant.priceOld) : (product.priceOld || 0),
                stock: currentVariant ? parseInt(currentVariant.stock) : (product.stock || 0),
                attributeList: attributeList,
                variants: product.variants
            },
        };

        const success = addToCart(cartItem);
        if (success) {
            setShowToast(true);
        }
        return success;
    };

    const handleBuyNow = () => {
        if (!product || !canAddToCart || maxStock === 0) return;

        // Thêm vào giỏ hàng trước
        const success = handleAddToCart();

        // Nếu thêm thành công mới chuyển hướng
        if (success) {
            navigate("/checkout");
        }
    };

    // Đồng bộ thông tin detail trong giỏ hàng khi fetch lại API sản phẩm
    useEffect(() => {
        if (!product) return;

        const cartItems = useCartStore.getState().items;
        const matchingItems = cartItems.filter(item => item.productId === product._id);

        if (matchingItems.length > 0) {
            matchingItems.forEach(item => {
                // Tìm lại variant tương ứng trong dữ liệu mới (nếu có)
                let currentNewStock = product.stock;
                let currentNewPrice = product.priceNew;

                if (item.variant) {
                    const foundVariant = product.variants?.find((v: any) =>
                        v.attributeValue.length === item.variant?.length &&
                        v.attributeValue.every((a: any) =>
                            item.variant?.some(ov => ov.attrId === a.attrId && ov.value === a.value)
                        )
                    );
                    if (foundVariant) {
                        currentNewStock = parseInt(foundVariant.stock);
                        currentNewPrice = parseInt(foundVariant.priceNew);
                    }
                }

                // Cập nhật detail mới nhất vào store
                const newDetail = {
                    ...item.detail,
                    priceNew: currentNewPrice,
                    stock: currentNewStock,
                    variants: product.variants
                };

                // Nếu số lượng hiện tại vượt quá tồn kho mới, tự động giảm xuống
                const newQuantity = Math.min(item.quantity, currentNewStock);

                useCartStore.getState().updateQuantity(item.productId, newQuantity, item.variant);

                // Cập nhật lại detail trong store (phần này có thể tối ưu thêm trong store, nhưng hiện tại updateQuantity chỉ update số lượng)
                // Ta có thể gọi hàm set trực tiếp hoặc thêm action updateDetail vào store. 
                // Ở đây ta dùng addToCart với quantity = 0 để lợi dụng logic update detail của nó
                addToCart({
                    ...item,
                    quantity: 0,
                    detail: newDetail
                });
            });
        }
    }, [product]);

    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => setShowToast(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    const handleDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : (maxStock > 0 ? 1 : 0)));
    const handleIncrease = () => setQuantity((prev) => (prev < maxStock ? prev + 1 : maxStock));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = Number(e.target.value);
        if (value < (maxStock > 0 ? 1 : 0)) value = (maxStock > 0 ? 1 : 0);
        if (value > maxStock) value = maxStock;
        setQuantity(value);
    };

    const handleSelectOption = (attrId: string, value: string) => {
        setSelectedOptions(prev => ({
            ...prev,
            [attrId]: value
        }));
    };

    if (isLoading) return (
        <div className="app-container py-[100px]">
            <Skeleton variant="rectangular" width="100%" height={500} sx={{ borderRadius: '20px' }} />
        </div>
    );

    if (error || !product) return <Typography sx={{ p: 5, textAlign: 'center', fontSize: '20px', color: 'red' }}>Sản phẩm không tồn tại</Typography>;

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Cửa hàng", to: "/shop" },
        { label: product.name, to: `/product/detail/${product.slug}` },
    ];

    return (
        <>
            <ProductBanner
                pageTitle="Chi tiết sản phẩm"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                className="bg-top"
            />
            <section className="relative px-[30px] bg-white pt-[80px]">
                <div className="app-container grid grid-cols-2 gap-[60px] 2xl:gap-[40px] relative">
                    <ProductGallery images={product.images || []} />
                    <div>
                        <div>
                            <h2 className="text-[36px] mt-[20px] font-secondary text-client-secondary">{product.name}</h2>
                            <div className="flex items-center my-[10px]">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            sx={{
                                                fontSize: "20px !important",
                                                color: i < Math.round(avgRating) ? "#ffbb00 !important" : "#ccc !important",
                                            }}
                                        />
                                    ))}
                                </div>
                                <span className="text-[20px] mx-[20px] text-[#ccc]">|</span>
                                <p className="text-[16px] text-[#505050]">({totalReviews} đánh giá từ khách hàng)</p>
                            </div>
                            <div className="flex items-center text-[16px]">
                                <strong className="text-client-secondary mr-[8px]">SKU:</strong>
                                <span className="text-[#505050]">{product.sku || "N/A"}</span>
                            </div>
                            {product.isFood && product.expiryDate && (
                                <div className="flex items-center text-[16px] mt-[5px]">
                                    <strong className="text-client-secondary mr-[8px]">Hạn sử dụng:</strong>
                                    <span style={{ color: new Date(product.expiryDate) < new Date() ? 'red' : '#505050' }}>
                                        {new Date(product.expiryDate).toLocaleDateString("vi-VN")}
                                        {new Date(product.expiryDate) < new Date() && " (Hết hạn)"}
                                    </span>
                                </div>
                            )}
                            {product.isFood && product.minAge !== undefined && (
                                <div className="flex items-center text-[16px] mt-[5px]">
                                    <strong className="text-client-secondary mr-[8px]">Độ tuổi:</strong>
                                    <span className="text-[#505050]">
                                        {(() => {
                                            const months = product.minAge || 0;
                                            if (months === 0) return "Tất cả mọi lứa tuổi";
                                            if (months >= 24) {
                                                const years = Math.floor(months / 12);
                                                const remMonths = months % 12;
                                                return `Từ ${years} năm ${remMonths > 0 ? `${remMonths} tháng` : ''} tuổi trở lên`;
                                            }
                                            if (months >= 12) {
                                                return `Từ 1 năm ${months % 12 > 0 ? `${months % 12} tháng` : ''} tuổi trở lên`;
                                            }
                                            return `Từ ${months} tháng tuổi trở lên`;
                                        })()}
                                    </span>
                                </div>
                            )}
                            <div className="mt-[20px] text-client-secondary text-[28px] font-secondary">
                                <p>{currentVariant ? `${parseInt(currentVariant.priceNew).toLocaleString("vi-VN")}đ` : priceRange}</p>
                            </div>
                            <div className="w-full flex items-center mt-[20px] mb-[30px] px-[40px] py-[20px] rounded-[48px] bg-[#FFF0F0]">
                                <span className="inline-block mr-[20px] text-[#FF6262] w-[35px] aspect-square"><svg className="w-full h-full" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 66"><path d="M33,0l6.1,9.5l10.4-5.1L50,15.7l11.6,0.8l-5.2,10L66,33l-9.5,6.1l5.1,10.4L50.3,50l-0.8,11.6l-10-5.2L33,66l-6.1-9.5 l-10.4,5.1L16,50.3L4.4,49.5l5.2-10L0,33l9.5-6.1L4.4,16.5L15.7,16l0.8-11.6l10,5.2L33,0z M41.7,18c-0.5-0.3-1.2-0.1-1.5,0.4 L24,46.5c-0.3,0.5-0.1,1.2,0.4,1.5c0.5,0.3,1.2,0.1,1.5-0.4L42,19.5C42.4,19,42.2,18.3,41.7,18z M43.6,38c-1.1-1.1-2.6-1.8-4.2-1.8 c-1.6,0-3.1,0.7-4.2,1.8s-1.8,2.6-1.8,4.2c0,1.7,0.7,3.1,1.8,4.2c1.1,1.1,2.6,1.7,4.2,1.7c1.7,0,3.1-0.7,4.2-1.7 c1.1-1.1,1.8-2.6,1.8-4.2C45.3,40.5,44.7,39,43.6,38z M42,44.9c-0.7,0.7-1.6,1.1-2.7,1.1c-1,0-2-0.4-2.7-1.1s-1.1-1.7-1.1-2.7 c0-1,0.4-2,1.1-2.7c0.7-0.7,1.6-1.1,2.7-1.1c1.1,0,2,0.4,2.7,1.1c0.7,0.7,1.1,1.6,1.1,2.7S42.7,44.2,42,44.9z M30.9,19.6 c-1.1-1.1-2.6-1.8-4.2-1.8c-1.6,0-3.1,0.7-4.2,1.8c-1.1,1.1-1.7,2.6-1.7,4.2c0,1.6,0.7,3.1,1.7,4.2c1.1,1.1,2.6,1.7,4.2,1.7 c1.7,0,3.1-0.7,4.2-1.7c1.1-1.1,1.8-2.6,1.8-4.2C32.6,22.2,31.9,20.7,30.9,19.6z M29.3,26.5c-0.7,0.7-1.7,1.1-2.7,1.1 c-1,0-2-0.4-2.7-1.1c-0.7-0.7-1.1-1.6-1.1-2.7c0-1.1,0.4-2,1.1-2.7s1.6-1.1,2.7-1.1c1.1,0,2,0.4,2.7,1.1s1.1,1.7,1.1,2.7 C30.5,24.9,30,25.8,29.3,26.5z"></path></svg></span>
                                <p className="text-[15px] text-[#505050]">Đảm bảo sản phẩm chất lượng cao, an toàn và thân thiện cho thú cưng của bạn.</p>
                            </div>

                            {/* Options động */}
                            <div className="mb-[20px]">
                                {attributeList.map((attr: any) => (
                                    <div key={attr._id} className="mb-[30px]">
                                        <div className="mb-[10px] text-client-secondary flex items-center">
                                            <span className="font-secondary text-[18px] ">{attr.name} :</span>
                                            {selectedOptions[attr._id] && (
                                                <span className="text-client-secondary ml-[5px]">
                                                    {attr.variantsLabel[attr.variants.indexOf(selectedOptions[attr._id])]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-[10px]">
                                            {attr.variants.map((val: string, index: number) => {
                                                const label = attr.variantsLabel[index];
                                                const isSelected = selectedOptions[attr._id] === val;
                                                return (
                                                    <div
                                                        key={val}
                                                        className={`flex items-center justify-center py-[8px] px-[20px] cursor-pointer capitalize rounded-[40px] transition-default border
                                                            ${isSelected
                                                                ? 'bg-client-secondary text-white border-client-secondary'
                                                                : 'bg-[#fff0f0] text-client-secondary border-transparent hover:bg-client-secondary hover:text-white'}`}
                                                        onClick={() => handleSelectOption(attr._id, val)}
                                                    >
                                                        {label}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(selectedOptions).length > 0 && (
                                    <div onClick={() => setSelectedOptions({})} className="underline font-secondary mt-[-15px] mb-[10px] text-[13px] cursor-pointer text-client-secondary hover:text-client-primary transition-default">Xóa lựa chọn</div>
                                )}
                            </div>

                            <div className="flex items-center gap-[20px] h-[60px] mt-[40px] mb-[30px]">
                                <div className="text-[#505050] bg-[#e67e2033] flex items-center h-full border border-[#eee] rounded-[40px] overflow-hidden">
                                    <input
                                        type="button"
                                        value="-"
                                        className="cursor-pointer w-[50px] text-client-text h-full text-[24px] bg-transparent hover:text-client-primary transition-colors"
                                        onClick={handleDecrease}
                                    />
                                    <input
                                        type="number"
                                        value={quantity}
                                        min={maxStock > 0 ? 1 : 0}
                                        max={maxStock}
                                        onChange={handleChange}
                                        className="w-[50px] h-full text-[18px] text-center outline-none no-spinner bg-transparent"
                                    />
                                    <input
                                        type="button"
                                        value="+"
                                        className="cursor-pointer w-[50px] text-client-text h-full text-[24px] bg-transparent hover:text-client-primary transition-colors"
                                        onClick={handleIncrease}
                                    />
                                </div>
                                <button
                                    onClick={handleAddToCart}
                                    className={`flex-1 h-full rounded-[40px] text-white text-[18px] font-secondary transition-all duration-300 ${maxStock === 0 ? 'bg-gray-400 cursor-not-allowed' : (canAddToCart ? 'bg-client-secondary cursor-pointer hover:bg-client-primary' : 'bg-client-secondary opacity-[0.6] cursor-not-allowed')}`}
                                    disabled={!canAddToCart || maxStock === 0}
                                >
                                    {maxStock === 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
                                </button>
                                <div
                                    onClick={() => {
                                        if (!product) return;
                                        if (attributeList.length > 0 && !canAddToCart) {
                                            toast.warning("Vui lòng chọn đầy đủ các thuộc tính để lưu vào danh sách yêu thích!");
                                            return;
                                        }
                                        toggleWishlist({
                                            productId: product._id,
                                            quantity: quantity,
                                            variant: currentVariant ? currentVariant.attributeValue : undefined,
                                            detail: {
                                                images: product.images || [],
                                                slug: product.slug,
                                                name: product.name,
                                                priceNew: currentVariant ? parseInt(currentVariant.priceNew) : (product.priceNew || 0),
                                                priceOld: currentVariant ? parseInt(currentVariant.priceOld) : (product.priceOld || 0),
                                                stock: currentVariant ? parseInt(currentVariant.stock) : (product.stock || 0),
                                                attributeList: attributeList,
                                                variants: product.variants
                                            }
                                        });
                                    }}
                                    className={`w-[60px] h-full flex items-center justify-center transition-all border border-[#eee] rounded-full cursor-pointer ${isInWishlist(product?._id, currentVariant?.attributeValue) ? 'bg-client-primary text-white border-client-primary' : 'text-client-secondary hover:text-client-primary hover:bg-[#fff0f0]'}`}
                                >
                                    <Heart className="w-[28px] h-[28px]" fill={isInWishlist(product?._id, currentVariant?.attributeValue) ? "currentColor" : "none"} />
                                </div>
                            </div>
                            <button
                                onClick={handleBuyNow}
                                disabled={!canAddToCart || maxStock === 0}
                                className={`text-center font-secondary w-full h-[60px] rounded-[40px] flex items-center justify-center text-[20px] text-white transition-all ${maxStock === 0 ? 'bg-gray-400 cursor-not-allowed' : (canAddToCart ? 'bg-client-primary cursor-pointer hover:bg-client-secondary' : 'bg-client-primary opacity-[0.6] cursor-not-allowed')}`}
                            >
                                Mua ngay
                            </button>
                            <ul className="mt-[60px] border-t border-[#eee] pt-[30px]">
                                <li className="flex items-center text-[16px] text-[#505050] my-[15px]">
                                    <UserCart className="text-client-primary mr-[15px] w-[24px] h-[24px]" />
                                    <span>Hỗ trợ <span className="text-client-primary font-bold">giao hàng tận nơi</span>, đóng gói chuyên nghiệp và nhanh chóng.</span>
                                </li>
                                <li className="flex items-center text-[16px] text-[#505050] my-[15px]">
                                    <EyeSolid className="text-client-primary mr-[15px] w-[24px] h-[24px]" />
                                    <span>Cam kết <span className="text-client-secondary font-bold">đồng hành</span> cùng bạn trong hành trình chăm sóc thú cưng.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            <ProductDesc description={product.description || ""} />
            <ProductComment productId={product._id} />
            <ProductRelated productId={product._id} categoryIds={product.category || []} />
            <FooterSub />

            {showToast && (
                <div
                    className={`fixed bottom-[32px] left-[18px] z-[999] p-[20px] bg-white shadow-2xl rounded-[20px] border border-[#eee] flex items-center max-w-[450px] animate-in slide-in-from-left duration-300`}
                >
                    <div className="w-[80px] h-[80px] rounded-[10px] overflow-hidden mr-[20px]">
                        <img src={product.images?.[0] || ""} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <div className="text-[14px] text-[#888]">Thành công!</div>
                        <div className="text-[18px] font-bold text-client-secondary line-clamp-1">{product.name}</div>
                        <p className="text-[14px] text-[#505050]">Đã thêm vào giỏ hàng.</p>
                    </div>
                </div>
            )}
        </>
    )
}