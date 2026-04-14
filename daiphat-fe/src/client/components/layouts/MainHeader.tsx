import { Handbag, Heart, Search, User } from "iconoir-react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "../ui/Button"
import { useCartStore } from "../../../stores/useCartStore";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useWishlistStore } from "../../../stores/useWishlistStore";
import { logout as logoutApi } from "../../api/auth.api";
import { getSuggestions } from "../../api/product.api";
import { toast } from "react-toastify";
import { useState, useEffect, useRef } from "react";
import { useSettingGeneral } from "../../hooks/useSettings";

export const MainHeader = () => {
    const { data: general } = useSettingGeneral();
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    const totalItemsCount = useCartStore((state) => state.totalItems());
    const totalAmount = useCartStore((state) => state.totalAmount());
    const items = useCartStore((state) => state.items);
    const isCartHydrated = useCartStore((state) => state.isHydrated);

    const user = useAuthStore((state) => state.user);
    const logoutStore = useAuthStore((state) => state.logout);
    const isAuthHydrated = useAuthStore((state) => state.isHydrated);

    const wishlistCount = useWishlistStore((state) => state.items.length);
    const isWishlistHydrated = useWishlistStore((state) => state.isHydrated);

    const cartCount = isCartHydrated ? totalItemsCount : 0;
    const removeFromCart = useCartStore((state) => state.removeFromCart);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (keyword.trim().length > 1) {
                try {
                    const res = await getSuggestions(keyword);
                    setSuggestions(res.data);
                    setShowSuggestions(true);
                } catch (error) {
                    setSuggestions([]);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRemove = (productId: string, variant?: any) => {
        setTimeout(() => {
            removeFromCart(productId, variant);
        }, 300);
    };

    const handleLogout = async () => {
        try {
            await logoutApi();
            logoutStore();
            toast.success("Đăng xuất thành công!");
        } catch (error) {
            console.log(error);
            toast.error("Lỗi khi đăng xuất!");
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (keyword.trim()) {
            navigate(`/shop?keyword=${encodeURIComponent(keyword.trim())}`);
            setShowSuggestions(false);
        }
    };

    return (
        <>
            <div className="p-[30px] bg-white border-b border-[#1029371A] z-50 relative">
                <div className="app-container flex items-center justify-between">
                    {/* Logo */}
                    <div className="w-[15%] flex justify-center">
                        <Link to="/">
                            <img src={general?.logo || "https://i.imgur.com/V2kwkkK.png"} alt={general?.websiteName || ""} className="w-[190px] object-cover z-10" />
                        </Link>
                    </div>

                    {/* Form Search */}
                    <div className="w-[34.2%] relative" ref={suggestionRef}>
                        <form onSubmit={handleSearch} className="flex">
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                placeholder="Tìm kiếm sản phẩm"
                                className="w-[95.2%] bg-[#10293708] rounded-l-[40px] h-[50px] border border-[#d7d7d7] px-[32px] py-[16px] focus:outline-none focus:border-[#102937] transition-[border] duration-300 ease-linear"
                            />
                            <button type="submit" className="ml-[-25px] w-[50px] h-[50px] rounded-full bg-client-secondary flex items-center justify-center text-white cursor-pointer hover:bg-client-primary transition-[background] duration-300 ease-linear border-none">
                                <Search stroke="3" width={24} height={24} />
                            </button>
                        </form>

                        {/* Gợi ý tìm kiếm */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-[60px] left-0 w-full bg-white border border-[#eee] shadow-xl rounded-[20px] z-[100] overflow-hidden py-[10px]">
                                {suggestions.map((item) => (
                                    <Link
                                        key={item._id}
                                        to={`/product/detail/${item.slug}`}
                                        onClick={() => setShowSuggestions(false)}
                                        className="flex items-center gap-[15px] px-[20px] py-[10px] hover:bg-[#fafafa] transition-default"
                                    >
                                        <img src={item.images?.[0]} alt="" className="w-[40px] h-[40px] object-cover rounded-[5px]" />
                                        <div className="flex-1">
                                            <p className="text-[14px] font-secondary text-client-secondary line-clamp-1">{item.name}</p>
                                            <p className="text-[12px] text-client-primary font-bold">{(item.priceNew || 0).toLocaleString()}đ</p>
                                        </div>
                                    </Link>
                                ))}
                                <div
                                    onClick={handleSearch}
                                    className="p-[10px] text-center text-[13px] text-gray-400 hover:text-client-primary cursor-pointer transition-default border-t border-[#eee]"
                                >
                                    Xem tất cả kết quả cho "{keyword}"
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-[30px] w-[34.2%] justify-end mr-[16px]">
                        <Link to="/dashboard/wishlist" className="relative w-[35px] h-[35px] flex items-center justify-center text-[#102937] hover:text-client-primary transition-[color] duration-300 cursor-pointer group">
                            <Heart stroke="2" className="w-[25px] h-[25px]" />
                            {isWishlistHydrated && wishlistCount > 0 && (
                                <span className="absolute right-[-1px] top-[-5px] w-[18px] h-[18px] text-[10px] bg-client-primary text-white rounded-full flex items-center justify-center animate-bounce-short">{wishlistCount}</span>
                            )}
                        </Link>
                        <div className="group relative w-[35px] h-[35px] flex items-center justify-center cursor-pointer">
                            <Link to="/cart">
                                <Handbag stroke="2" className="w-[25px] h-[25px] text-[#102937] group-hover:text-client-primary transition-default" />
                            </Link>
                            {cartCount > 0 && (
                                <span className="absolute right-[-1px] top-[-5px] w-[18px] h-[18px] text-[10px] bg-client-secondary text-white rounded-full flex items-center justify-center">{cartCount}</span>
                            )}
                            <div
                                className="hidden group-hover:block bg-white border border-[#d7d7d7] min-w-[350px] p-[20px] absolute top-[45px] right-[-20px] rounded-[20px] shadow-[0_-1px_8px_3px_#10293714] z-50 after:content-[''] after:block after:absolute after:w-0 after:h-0 after:border-solid after:border-[8px] after:border-transparent after:border-b-[#d7d7d7] after:right-[28px] after:top-[-16px]"
                            >
                                {items.length > 0 ? (
                                    <ul>
                                        {items.map((item, index) => (
                                            <li key={index} className="p-[15px] w-full relative bg-[#fff0f0] rounded-[10px] flex mb-[15px]">
                                                <div
                                                    onClick={() => handleRemove(item.productId, item.variant)}
                                                    className="absolute left-[-7px] top-[-7px] text-[12px] bg-[#10293726] text-client-secondary hover:bg-client-primary hover:text-white transition-default w-[20px] h-[20px] rounded-full flex items-center justify-center">
                                                    x
                                                </div>
                                                <Link to={`/product/detail/${item.detail?.slug || "#"}`} className="inline-block w-[80px] h-[80px] mr-[20px]">
                                                    <img src={item.detail?.images?.[0] || undefined} width={80} height={80} alt="" className="w-full h-full object-cover rounded-[10px]" />
                                                </Link>
                                                <div>
                                                    <h3 className="text-client-secondary hover:text-client-text transition-default font-secondary text-[18px] mb-[3px] line-clamp-1">{item.detail?.name || "Sản phẩm không xác định"}</h3>
                                                    {item.variant && item.variant.length > 0 && (
                                                        <div className="text-client-text text-[14px] font-[400] mb-[5px]">
                                                            <span className="text-client-secondary font-secondary mr-[2px]">Phân loại:</span>
                                                            {item.variant.map(v => v.label).join(", ")}
                                                        </div>
                                                    )}
                                                    <div className="text-client-text text-[14px]">{item.quantity} x {(item.detail?.priceNew || 0).toLocaleString()}đ</div>
                                                </div>
                                            </li>
                                        ))}
                                        <div className="border-t border-[#d7d7d7] text-client-secondary font-[700] text-[18px] mt-[20px] pt-[10px] flex justify-between">
                                            <strong>Tạm tính:</strong>
                                            <span>{totalAmount.toLocaleString()}đ</span>
                                        </div>
                                        <div className="mt-[20px] mb-[5px]">
                                            <Link to="/cart" className="block text-[14px] font-secondary bg-client-secondary hover:bg-client-primary transition-default text-white py-[16px] px-[30px] cursor-pointer text-center rounded-[40px] mb-[10px]">Xem giỏ hàng</Link>
                                            <Link to="/checkout" className="block text-[14px] font-secondary bg-client-secondary hover:bg-client-primary transition-default text-white py-[16px] px-[30px] cursor-pointer text-center rounded-[40px]">Thanh toán</Link>
                                        </div>
                                    </ul>
                                ) : (
                                    <span className="text-[16px] text-client-secondary">Không có sản phẩm trong giỏ hàng.</span>
                                )}

                            </div>
                        </div>
                        {isAuthHydrated && user ? (
                            <div className="group relative flex items-center gap-[10px] cursor-pointer">
                                <Link to="/dashboard/profile" className="w-[35px] h-[35px] p-[5px] flex items-center justify-center text-[#102937] hover:text-client-primary transition-default rounded-full border border-[#eee]">
                                    <User stroke="2" className="w-[20px] h-[20px]" />
                                </Link>

                                <div className="hidden group-hover:block absolute top-[40px] right-0 bg-white border border-[#eee] shadow-lg rounded-[15px] min-w-[180px] z-[60] overflow-hidden">
                                    <div className="p-[15px] border-b border-[#eee] bg-[#fafafa]">
                                        <p className="text-[12px] text-gray-500">Chào mừng,</p>
                                        <p className="text-[14px] font-bold text-client-secondary truncate">{user.fullName}</p>
                                    </div>
                                    <Link to="/dashboard/profile" className="block px-[20px] py-[12px] text-[14px] text-client-secondary hover:bg-[#FFF0F0] hover:text-client-primary transition-default">Thông tin tài khoản</Link>
                                    <div
                                        onClick={handleLogout}
                                        className="block px-[20px] py-[12px] text-[14px] text-red-500 hover:bg-red-50 transition-default cursor-pointer"
                                    >
                                        Đăng xuất
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link to="/auth/login" className="w-[35px] h-[35px] flex items-center justify-center text-[#102937] hover:text-client-primary transition-[color] duration-300 cursor-pointer">
                                <User stroke="2" className="w-[25px] h-[25px]" />
                            </Link>
                        )}
                        <Button
                            url="/contact"
                            content="Liên hệ"
                            background="bg-client-secondary"
                            hoverBackground="group-hover:bg-client-primary"
                            svgColor="text-client-secondary"
                            hoverSvgColor="group-hover:text-client-primary"
                            textColor="text-white"
                            hoverTextColor="text-white"
                            iconColor="before:bg-white after:bg-white"
                            hoverIconColor="hover:before:bg-white hover:after:bg-white"
                        />
                    </div>
                </div>
            </div>
        </>
    )
}