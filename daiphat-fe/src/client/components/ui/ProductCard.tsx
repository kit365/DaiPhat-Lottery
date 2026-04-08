import StarIcon from "@mui/icons-material/Star";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { Link } from "react-router-dom";
import type { Product } from "../../../types/products.type";
import { useWishlistStore } from "../../../stores/useWishlistStore";
import { useCartStore, CartItem } from "../../../stores/useCartStore";
import { toast } from "react-toastify";
import { useState } from "react";
import { QuickViewModal } from "./QuickViewModal";

export const ProductCard = ({ product, rawData }: { product: Product, rawData?: any }) => {
    const { toggleWishlist, isInWishlist } = useWishlistStore();
    const addToCart = useCartStore((state) => state.addToCart);
    const isFavorite = isInWishlist(product.id.toString());

    const [modalState, setModalState] = useState<{ isOpen: boolean; mode: "cart" | "wishlist" }>({
        isOpen: false,
        mode: "cart"
    });

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // If product has variants, show quick view modal
        if (rawData?.variants?.length > 0) {
            setModalState({ isOpen: true, mode: "wishlist" });
            return;
        }

        // Prepare the detail object from available data for non-variant products
        const itemToSave = {
            productId: product.id.toString(),
            quantity: 1,
            detail: {
                images: rawData?.images || [product.primaryImage],
                slug: product.url.split("/").pop() || "",
                name: product.title,
                priceNew: parseInt(product.price.replace(/\D/g, "")),
                priceOld: rawData?.priceOld || parseInt(product.price.replace(/\D/g, "")),
                stock: rawData?.stock || 99,
                attributeList: rawData?.attributes || [],
                variants: rawData?.variants || [],
            }
        };

        toggleWishlist(itemToSave);
        if (!isFavorite) {
            toast.success(`Đã thêm ${product.title} vào yêu thích!`);
        }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // If product has variants, show quick view modal
        if (rawData?.variants?.length > 0) {
            setModalState({ isOpen: true, mode: "cart" });
            return;
        }

        // Check stock
        if (rawData?.stock <= 0) {
            toast.error("Sản phẩm đã hết hàng!");
            return;
        }

        // Prepare the cart item
        const cartItem: CartItem = {
            productId: product.id.toString(),
            quantity: 1,
            checked: true,
            detail: {
                images: rawData?.images || [product.primaryImage],
                slug: product.url.split("/").pop() || "",
                name: product.title,
                priceNew: parseInt(product.price.replace(/\D/g, "")),
                priceOld: rawData?.priceOld || parseInt(product.price.replace(/\D/g, "")),
                stock: rawData?.stock || 99,
                attributeList: rawData?.attributes || [],
                variants: rawData?.variants || [],
            },
        };

        const success = addToCart(cartItem);
        if (success) {
            toast.success(`Đã thêm ${product.title} vào giỏ hàng!`);
        }
    };

    return (
        <div className="bg-[#fff0f0] rounded-[20px] overflow-hidden product-item transition-all duration-300 ease-linear hover:bg-client-primary group relative flex flex-col h-full">
            <QuickViewModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                productSlug={product.url.split("/").pop() || ""}
                mode={modalState.mode}
            />

            {/* Wishlist Toggle Button */}
            <div
                onClick={handleToggleWishlist}
                className="absolute top-[25px] left-[25px] z-10 w-[40px] h-[40px] rounded-full bg-white/80 flex items-center justify-center cursor-pointer hover:bg-white transition-all shadow-sm"
            >
                {isFavorite ? (
                    <FavoriteIcon sx={{ color: "#FF6262", fontSize: "24px" }} />
                ) : (
                    <FavoriteBorderIcon sx={{ color: "#FF6262", fontSize: "24px" }} />
                )}
            </div>

            <div className="p-[15px]">
                <Link to={product.url} className="block relative rounded-[20px] overflow-hidden aspect-[327/343]">
                    {/*Primary Image */}
                    <img
                        className="primary-image-item w-full h-full object-cover rounded-[20px] transition-opacity duration-700 opacity-100 cursor-pointer absolute top-0 left-0"
                        src={product.primaryImage}
                        alt={product.title}
                    />
                    {/* Secondary Image */}
                    <img
                        className="secondary-image-item w-full h-full object-cover rounded-[20px] transition-opacity duration-700 opacity-0 cursor-pointer absolute top-0 left-0"
                        src={product.secondaryImage}
                        alt={product.title}
                    />
                    {product.isSale && (
                        <div className="px-[10px] absolute right-[20px] top-[20px] inline-flex text-[12px] uppercase tracking-normal text-white bg-client-primary rounded-[30px] min-h-[25px] min-w-[50px] items-center justify-center">
                            SALE
                        </div>
                    )}
                </Link>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-[20px] mt-auto">
                <div className="pl-[30px] pr-[30px] pb-[20px] overflow-hidden">
                    {/* Rating */}
                    <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                            <StarIcon
                                key={i}
                                sx={{
                                    fontSize: "20px !important",
                                    color: i < product.rating ? "#ffbb00 !important" : "#ccc !important",
                                }}
                            />
                        ))}
                    </div>

                    {/* Title */}
                    <Link
                        to={product.url}
                        className="block text-client-secondary text-[22px] 2xl:text-[20px] truncate font-secondary leading-[1.3] transition-all duration-[350ms] ease-in-out my-[10px] group-hover:text-white hover:opacity-70"
                    >
                        {product.title}
                    </Link>

                    {/* Price */}
                    <p className="text-client-secondary group-hover:text-white transition-default font-bold">
                        {product.price}
                    </p>
                </div>

                {/* Cart Button */}
                <div className="flex flex-col justify-end">
                    <div className="w-[61px] h-[61px] pt-[10px] pr-[1px] pb-[1px] pl-[10px] relative rounded-tl-[30px] bg-white cart-button">
                        <div
                            onClick={handleAddToCart}
                            className="w-[50px] h-[50px] rounded-full bg-client-primary flex items-center justify-center duration-[375ms] ease-[cubic-bezier(0.7,0,0.3,1)] group-hover:bg-client-secondary cursor-pointer"
                        >
                            <ShoppingCartOutlinedIcon
                                className="text-white"
                                sx={{ fontSize: "40px" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
