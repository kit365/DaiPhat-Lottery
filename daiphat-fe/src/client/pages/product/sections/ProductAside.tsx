import SearchIcon from "@mui/icons-material/Search";
import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProductAsideTitle } from "./ProductAsideTitle";
import { ProductAsideList } from "./ProductAsideList";
import { useCategories, useBrands, useProducts } from "../../../hooks/useProduct";
import StarIcon from "@mui/icons-material/Star";

const maxPrice = 5000000;

export const ProductAside = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: categoriesData } = useCategories();
    const { data: brandsData } = useBrands();

    // Lấy 3 sản phẩm mới nhất
    const { data: newestProductsData } = useProducts({
        limit: 3,
        sortKey: "createdAt",
        sortValue: "desc"
    });

    // State cho tìm kiếm local
    const [localKeyword, setLocalKeyword] = useState(searchParams.get("keyword") || "");

    // State cho khoảng giá
    const [minPriceRange, setMinPriceRange] = useState(() => {
        const min = parseInt(searchParams.get("minPrice") || "0");
        return Math.round((min / maxPrice) * 100);
    });
    const [maxPriceRange, setMaxPriceRange] = useState(() => {
        const max = parseInt(searchParams.get("maxPrice") || maxPrice.toString());
        return Math.round((max / maxPrice) * 100);
    });

    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<null | "min" | "max">(null);

    const categories = categoriesData?.map((cat: any) => ({
        name: cat.name,
        count: cat.productCount || 0,
        to: `/shop?category=${cat.slug}`
    })) || [];

    const brands = brandsData?.map((brand: any) => ({
        name: brand.name,
        count: brand.productCount || 0,
        to: `/shop?brand=${brand.slug}`
    })) || [];

    const newestProducts = newestProductsData?.products || [];

    const handleMouseDown = (type: "min" | "max") => {
        setDragging(type);
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        const step = 2;
        const clamped = Math.min(Math.max(Math.round(percent / step) * step, 0), 100);

        if (dragging === "min" && clamped <= maxPriceRange) {
            setMinPriceRange(clamped);
        } else if (dragging === "max" && clamped >= minPriceRange) {
            setMaxPriceRange(clamped);
        }
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragging, minPriceRange, maxPriceRange]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        searchParams.set("keyword", localKeyword);
        searchParams.set("page", "1");
        setSearchParams(searchParams);
    };

    const handlePriceFilter = () => {
        searchParams.set("minPrice", Math.round(minPriceRange / 100 * maxPrice).toString());
        searchParams.set("maxPrice", Math.round(maxPriceRange / 100 * maxPrice).toString());
        searchParams.set("page", "1");
        setSearchParams(searchParams);
    };

    return (
        <aside className="w-[400px] 2xl:w-[300px] pb-[120px] 2xl:pb-[100px] sticky top-0 self-start">
            {/* Tìm kiếm */}
            <form className="relative mb-[40px]" onSubmit={handleSearchSubmit}>
                <input
                    type="text"
                    value={localKeyword}
                    onChange={(e) => setLocalKeyword(e.target.value)}
                    placeholder="Tìm kiếm sản phẩm..."
                    className="w-full outline-none text-client-text border border-[#d7d7d7] px-[32px] py-[16px] bg-white rounded-[40px]"
                />
                <button
                    type="submit"
                    className="absolute top-0 right-0 p-[10px] rotate-90 rounded-full text-white bg-client-primary hover:bg-client-secondary transition-default cursor-pointer w-[57px] h-[57px] flex items-center justify-center"
                >
                    <SearchIcon sx={{ fontSize: "35px" }} />
                </button>
            </form>

            {/* Danh mục */}
            <div className="mb-[40px]">
                <ProductAsideTitle title="Mua sắm theo danh mục" />
                <ProductAsideList categories={categories} />
            </div>

            {/* Khoảng giá */}
            <div className="mb-[40px]">
                <ProductAsideTitle title="Khoảng giá" />
                <div className="mt-[40px]">
                    <div
                        ref={trackRef}
                        className="bg-[#10293726] rounded-[16px] h-[3px] mx-[8px] relative select-none"
                    >
                        <div
                            className="absolute top-0 bg-client-secondary h-full z-[1] rounded-[16px]"
                            style={{
                                left: `${minPriceRange}%`,
                                width: `${maxPriceRange - minPriceRange}%`,
                            }}
                        ></div>

                        {/* Nút min */}
                        <span
                            onMouseDown={() => handleMouseDown("min")}
                            className="absolute top-[1px] translate-y-[-50%] bg-client-primary rounded-full w-[16px] ml-[-8px] h-[16px] z-[2] cursor-ew-resize"
                            style={{
                                left: `${minPriceRange}%`,
                            }}
                        ></span>

                        {/* Nút max */}
                        <span
                            onMouseDown={() => handleMouseDown("max")}
                            className="absolute top-[1px] translate-y-[-50%] bg-client-primary rounded-full w-[16px] ml-[-8px] h-[16px] z-[2] cursor-ew-resize"
                            style={{
                                left: `${maxPriceRange}%`,
                            }}
                        ></span>
                    </div>

                    {/* Giá hiển thị */}
                    <div className="flex justify-between mt-[20px] text-client-text text-[14px]">
                        <span>
                            Giá: {(minPriceRange / 100 * maxPrice).toLocaleString("vi-VN")}đ - {(maxPriceRange / 100 * maxPrice).toLocaleString("vi-VN")}đ
                        </span>
                    </div>
                </div>
                <div className="relative block min-w-[135px] mt-[15px]">
                    <button
                        onClick={handlePriceFilter}
                        className={`button-text cursor-pointer before:bg-white after:bg-white bg-client-primary hover:bg-client-secondary text-white hover:[box-shadow:0_0_30px_#ffffff33] inline-block relative mask-[url('/mask-bg-button.svg')] mask-no-repeat mask-center mask-[size:100%] rounded-[10px] px-[40px] py-[10px] text-[16px] font-secondary transition-default`}
                    >
                        Lọc
                    </button>
                </div>
            </div>

            {/* Thương hiệu */}
            <div className="mb-[40px]">
                <ProductAsideTitle title="Thương hiệu" />
                <ProductAsideList categories={brands} />
            </div>

            {/* Sản phẩm mới nhất */}
            <div className="mb-[40px]">
                <ProductAsideTitle title="Sản phẩm" />
                <ul className="mt-[25px]">
                    {newestProducts.map((item: any) => (
                        <li key={item._id} className="p-[15px] mb-[15px] rounded-[10px] bg-[#fff0f066] flex">
                            <Link to={`/product/detail/${item.slug}`} className="mr-[20px] rounded-[10px] overflow-hidden w-[80px] h-[84px] flex-shrink-0">
                                <img src={item.images?.[0]} alt="" className="w-full h-full object-cover" />
                            </Link>
                            <div>
                                <Link to={`/product/detail/${item.slug}`} className="block text-[17px] font-secondary text-client-secondary hover:text-client-primary transition-default mb-[2px] line-clamp-1">{item.name}</Link>
                                <div className="flex items-center mb-[7px] ml-[-5px]">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            sx={{
                                                fontSize: "18px !important",
                                                color: "#ffbb00 !important",
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="text-client-text">{(item.priceNew || 0).toLocaleString()}đ</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

        </aside>
    )
}
