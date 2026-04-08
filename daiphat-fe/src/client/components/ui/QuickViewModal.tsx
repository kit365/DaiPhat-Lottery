import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import StarIcon from "@mui/icons-material/Star";
import { UserCart, EyeSolid } from "iconoir-react";
import { useProductDetail } from "../../hooks/useProduct";
import { useCartStore } from "../../../stores/useCartStore";
import { useWishlistStore } from "../../../stores/useWishlistStore";
import { toast } from "react-toastify";
import { Skeleton } from "@mui/material";

interface QuickViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    productSlug: string;
    mode: "cart" | "wishlist";
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
    isOpen,
    onClose,
    productSlug,
    mode = "cart"
}) => {
    const { data: productData, isLoading } = useProductDetail(productSlug);
    const product = productData?.productDetail;
    const attributeList = productData?.attributeList || [];

    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);

    const addToCart = useCartStore((state) => state.addToCart);
    const { toggleWishlist, isInWishlist } = useWishlistStore();

    // Reset state when modal opens or product changes
    useEffect(() => {
        if (isOpen) {
            setSelectedOptions({});
            setQuantity(1);
        }
    }, [isOpen, productSlug]);

    const currentVariant = useMemo(() => {
        if (!product || !product.variants || attributeList.length === 0) return null;

        return product.variants.find((v: any) => {
            if (!v.status) return false;
            return v.attributeValue.every((attr: any) => {
                return selectedOptions[attr.attrId] === attr.value;
            });
        });
    }, [product, selectedOptions, attributeList]);

    const maxStock = useMemo(() => {
        if (currentVariant) return Math.max(0, parseInt(currentVariant.stock) || 0);
        return Math.max(0, product?.stock || 0);
    }, [currentVariant, product]);

    const canAction = useMemo(() => {
        if (!product) return false;
        if (attributeList.length === 0) return true;
        return Object.keys(selectedOptions).length === attributeList.length;
    }, [product, selectedOptions, attributeList]);

    const handleAction = () => {
        if (!product || !canAction) return;

        const baseItem = {
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
            },
        };

        if (mode === "cart") {
            const success = addToCart({ ...baseItem, checked: true });
            if (success) {
                toast.success(`Đã thêm ${product.name} vào giỏ hàng!`);
                onClose();
            }
        } else {
            toggleWishlist(baseItem);
            toast.success(`Đã cập nhật ${product.name} trong danh sách yêu thích!`);
            onClose();
        }
    };

    const handleSelectOption = (attrId: string, value: string) => {
        setSelectedOptions(prev => ({ ...prev, [attrId]: value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-[900px] rounded-[32px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] relative flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[95vh]"
                    >
                        {/* Close Button */}
                        <div
                            onClick={onClose}
                            className="absolute top-6 right-6 z-20 cursor-pointer text-gray-400 hover:text-client-primary transition-all duration-300"
                        >
                            <Icon icon="solar:close-circle-bold" className="text-[40px]" />
                        </div>

                        {isLoading ? (
                            <div className="w-full p-10 flex flex-col md:flex-row gap-10">
                                <Skeleton variant="rectangular" width="100%" height={400} className="rounded-2xl" />
                                <div className="flex-1 space-y-4">
                                    <Skeleton variant="text" width="40%" height={30} />
                                    <Skeleton variant="text" width="80%" height={60} />
                                    <Skeleton variant="rectangular" width="100%" height={100} className="rounded-xl" />
                                    <Skeleton variant="rectangular" width="100%" height={50} className="rounded-full" />
                                </div>
                            </div>
                        ) : product ? (
                            <>
                                {/* Left Side: Media */}
                                <div className="w-full md:w-[45%] bg-gray-50 h-[300px] md:h-auto relative overflow-hidden">
                                    <img
                                        src={product.images?.[0] || ""}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {product.priceOld > product.priceNew && (
                                        <div className="absolute top-6 left-6 px-4 py-1 bg-client-primary text-white text-[14px] font-bold rounded-full">
                                            SALE!
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: Content */}
                                <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                                    <h2 className="text-[28px] font-secondary text-client-secondary leading-tight mb-2">{product.name}</h2>

                                    <div className="flex items-center mb-4">
                                        <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => (
                                                <StarIcon
                                                    key={i}
                                                    sx={{
                                                        fontSize: "18px !important",
                                                        color: i < 5 ? "#ffbb00 !important" : "#ccc !important",
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[18px] mx-3 text-[#ccc]">|</span>
                                        <p className="text-[14px] text-[#505050]">Sản phẩm chất lượng cao</p>
                                    </div>

                                    <div className="text-client-secondary text-[24px] font-secondary mb-4">
                                        <p>{currentVariant ? `${parseInt(currentVariant.priceNew).toLocaleString("vi-VN")}đ` :
                                            (product.priceNew || 0).toLocaleString("vi-VN") + "đ"}</p>
                                    </div>

                                    {/* Benefit Banner from Detail Page */}
                                    <div className="w-full flex items-center mb-6 px-5 py-4 rounded-[48px] bg-[#FFF0F0]">
                                        <span className="inline-block mr-4 text-[#FF6262] w-7 flex-shrink-0">
                                            <svg className="w-full h-full" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 66"><path d="M33,0l6.1,9.5l10.4-5.1L50,15.7l11.6,0.8l-5.2,10L66,33l-9.5,6.1l5.1,10.4L50.3,50l-0.8,11.6l-10-5.2L33,66l-6.1-9.5 l-10.4,5.1L16,50.3L4.4,49.5l5.2-10L0,33l9.5-6.1L4.4,16.5L15.7,16l0.8-11.6l10,5.2L33,0z M41.7,18c-0.5-0.3-1.2-0.1-1.5,0.4 L24,46.5c-0.3,0.5-0.1,1.2,0.4,1.5c0.5,0.3,1.2,0.1,1.5-0.4L42,19.5C42.4,19,42.2,18.3,41.7,18z M43.6,38c-1.1-1.1-2.6-1.8-4.2-1.8 c-1.6,0-3.1,0.7-4.2,1.8s-1.8,2.6-1.8,4.2c0,1.7,0.7,3.1,1.8,4.2c1.1,1.1,2.6,1.7,4.2,1.7c1.7,0,3.1-0.7,4.2-1.7 c1.1-1.1,1.8-2.6,1.8-4.2C45.3,40.5,44.7,39,43.6,38z M42,44.9c-0.7,0.7-1.6,1.1-2.7,1.1c-1,0-2-0.4-2.7-1.1s-1.1-1.7-1.1-2.7 c0-1,0.4-2,1.1-2.7c0.7-0.7,1.6-1.1,2.7-1.1c1.1,0,2,0.4,2.7,1.1c0.7,0.7,1.1,1.6,1.1,2.7S42.7,44.2,42,44.9z M30.9,19.6 c-1.1-1.1-2.6-1.8-4.2-1.8c-1.6,0-3.1,0.7-4.2,1.8c-1.1,1.1-1.7,2.6-1.7,4.2c0,1.6,0.7,3.1,1.7,4.2c1.1,1.1,2.6,1.7,4.2,1.7 c1.7,0,3.1-0.7,4.2-1.7c1.1-1.1,1.8-2.6,1.8-4.2C32.6,22.2,31.9,20.7,30.9,19.6z M29.3,26.5c-0.7,0.7-1.7,1.1-2.7,1.1 c-1,0-2-0.4-2.7-1.1c-0.7-0.7-1.1-1.6-1.1-2.7c0-1.1,0.4-2,1.1-2.7s1.6-1.1,2.7-1.1c1.1,0,2,0.4,2.7,1.1s1.1,1.7,1.1,2.7 C30.5,24.9,30,25.8,29.3,26.5z"></path></svg>
                                        </span>
                                        <p className="text-[13px] text-[#505050]">Đảm bảo sản phẩm chất lượng cao, an toàn cho thú cưng.</p>
                                    </div>

                                    {/* Attributes (Styled like Detail Page) */}
                                    <div className="space-y-6">
                                        {attributeList.map((attr: any) => (
                                            <div key={attr._id}>
                                                <div className="mb-2 text-client-secondary flex items-center">
                                                    <span className="font-secondary text-[16px]">{attr.name} :</span>
                                                    {selectedOptions[attr._id] && (
                                                        <span className="text-client-secondary ml-1 font-bold">
                                                            {attr.variantsLabel[attr.variants.indexOf(selectedOptions[attr._id])]}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center flex-wrap gap-2">
                                                    {attr.variants.map((val: string, index: number) => {
                                                        const label = attr.variantsLabel[index];
                                                        const isSelected = selectedOptions[attr._id] === val;
                                                        return (
                                                            <div
                                                                key={val}
                                                                className={`flex items-center justify-center py-2 px-5 cursor-pointer capitalize rounded-[40px] transition-default border text-[14px]
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
                                            <div onClick={() => setSelectedOptions({})} className="underline font-secondary mt-1 text-[12px] cursor-pointer text-client-secondary hover:text-client-primary transition-default inline-block">Xóa lựa chọn</div>
                                        )}
                                    </div>

                                    {/* Action Row (Styled like Detail Page) */}
                                    <div className="flex items-center gap-4 h-[50px] mt-8 mb-6">
                                        <div className="text-[#505050] bg-[#e67e2033] flex items-center h-full border border-[#eee] rounded-[40px] overflow-hidden">
                                            <input
                                                type="button"
                                                value="-"
                                                className="cursor-pointer w-10 text-client-text h-full text-[20px] bg-transparent hover:text-client-primary transition-colors"
                                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                            />
                                            <input
                                                type="number"
                                                value={quantity}
                                                readOnly
                                                className="w-10 h-full text-[16px] text-center outline-none no-spinner bg-transparent font-bold"
                                            />
                                            <input
                                                type="button"
                                                value="+"
                                                className="cursor-pointer w-10 text-client-text h-full text-[20px] bg-transparent hover:text-client-primary transition-colors"
                                                onClick={() => setQuantity(q => (q < maxStock ? q + 1 : q))}
                                            />
                                        </div>

                                        <button
                                            onClick={handleAction}
                                            disabled={!canAction || maxStock === 0}
                                            className={`flex-1 h-full rounded-[40px] text-white text-[16px] font-secondary transition-all duration-300 flex items-center justify-center gap-2
                                                ${maxStock === 0 ? 'bg-gray-400 cursor-not-allowed' :
                                                    (canAction ? 'bg-client-secondary cursor-pointer hover:bg-client-primary' : 'bg-client-secondary opacity-60 cursor-not-allowed')}`}
                                        >
                                            <Icon icon={mode === "cart" ? "solar:cart-large-linear" : "solar:heart-bold"} />
                                            {maxStock === 0 ? "Hết hàng" : (mode === "cart" ? "Xác nhận thêm" : "Thêm yêu thích")}
                                        </button>

                                        <div
                                            onClick={() => {
                                                if (!product) return;
                                                if (attributeList.length > 0 && !canAction) {
                                                    toast.warning("Vui lòng chọn đầy đủ các thuộc tính để lưu vào danh sách yêu thích!");
                                                    return;
                                                }
                                                toggleWishlist({
                                                    productId: product._id,
                                                    quantity: 1,
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
                                                });
                                            }}
                                            className={`w-[50px] h-full flex items-center justify-center transition-all border border-[#eee] rounded-full cursor-pointer ${isInWishlist(product?._id, currentVariant?.attributeValue) ? 'bg-client-primary text-white border-client-primary' : 'text-client-secondary hover:text-client-primary hover:bg-[#fff0f0]'}`}
                                        >
                                            <Icon icon={isInWishlist(product?._id, currentVariant?.attributeValue) ? "solar:heart-bold" : "solar:heart-linear"} className="text-[22px]" />
                                        </div>
                                    </div>

                                    {/* Commitments List from Detail Page */}
                                    <ul className="pt-6 border-t border-[#eee] space-y-3">
                                        <li className="flex items-center text-[13px] text-[#505050]">
                                            <UserCart className="text-client-primary mr-3 w-5 h-5 flex-shrink-0" />
                                            <span>Hỗ trợ <span className="text-client-primary font-bold">giao hàng tận nơi</span> nhanh chóng.</span>
                                        </li>
                                        <li className="flex items-center text-[13px] text-[#505050]">
                                            <EyeSolid className="text-client-primary mr-3 w-5 h-5 flex-shrink-0" />
                                            <span>Cam kết <span className="text-client-secondary font-bold">đồng hành</span> cùng thú cưng.</span>
                                        </li>
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <div className="p-20 text-center text-red-500 font-bold font-secondary">
                                Không tìm thấy thông tin sản phẩm.
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
