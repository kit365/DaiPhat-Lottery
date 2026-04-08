import { FooterSub } from "../../components/layouts/FooterSub"
import { ProductAside } from "./sections/ProductAside"
import { ProductBanner } from "./sections/ProductBanner"
import { ProductCard } from "../../components/ui/ProductCard"
import { ProductListSearch } from "./sections/ProductListSearch"
import { useSearchParams } from "react-router-dom"
import { useProducts, useCategories } from "../../hooks/useProduct"
import { Skeleton, Pagination } from "@mui/material"
import { useMemo } from "react"

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Cửa hàng", to: "/shop" },
];

export const ProductListPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Lấy các tham số từ URL
    const params = useMemo(() => ({
        keyword: searchParams.get("keyword") || "",
        categorySlug: searchParams.get("category") || "",
        brandSlug: searchParams.get("brand") || "",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
        sortKey: searchParams.get("sortKey") || "position",
        sortValue: searchParams.get("sortValue") || "desc",
        page: searchParams.get("page") || "1",
        limit: 9
    }), [searchParams]);

    const { data: productsData, isLoading } = useProducts(params);
    const { data: categoriesData } = useCategories();

    const selectedCategory = useMemo(() => {
        if (!categoriesData || !params.categorySlug) return null;
        return categoriesData.find((cat: any) => cat.slug === params.categorySlug);
    }, [categoriesData, params.categorySlug]);

    const pageTitle = selectedCategory ? selectedCategory.name : "Cửa hàng";

    const handlePageChange = (_: any, value: number) => {
        searchParams.set("page", value.toString());
        setSearchParams(searchParams);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
            <ProductBanner
                pageTitle={pageTitle}
                breadcrumbs={[...breadcrumbs, ...(selectedCategory ? [{ label: selectedCategory.name, to: '#' }] : [])]}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-blog-listing.jpg"
                className="bg-top"
            />

            <div className="app-container flex gap-[80px] 2xl:gap-[30px] relative">
                <ProductAside />
                <section className="w-[1040px] 2xl:w-[970px]">
                    <ProductListSearch
                        totalItems={productsData?.totalItems || 0}
                        currentLimit={params.limit}
                        currentPage={parseInt(params.page)}
                    />
                    <div className="grid grid-cols-3 gap-[30px] min-h-[500px]">
                        {isLoading ? (
                            Array.from({ length: 9 }).map((_, idx) => (
                                <div key={idx} className="space-y-4">
                                    <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: '20px' }} />
                                    <Skeleton variant="text" width="60%" height={30} />
                                    <Skeleton variant="text" width="40%" height={20} />
                                </div>
                            ))
                        ) : productsData?.products?.length > 0 ? (
                            productsData.products.map((item: any) => (
                                <ProductCard
                                    key={item._id}
                                    product={{
                                        id: item._id,
                                        title: item.name,
                                        price: `${(item.priceNew || item.priceOld || 0).toLocaleString("vi-VN")}đ`,
                                        primaryImage: item.images?.[0] || "",
                                        secondaryImage: item.images?.[1] || item.images?.[0] || "",
                                        rating: 5,
                                        isSale: item.priceOld > item.priceNew,
                                        url: `/product/detail/${item.slug}`,
                                    }}
                                    rawData={item}
                                />
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-[100px] text-gray-500">
                                Không tìm thấy sản phẩm nào khớp với lựa chọn của bạn.
                            </div>
                        )}
                    </div>

                    {productsData?.totalPages > 1 && (
                        <div className="flex justify-center mt-[65px] mb-[100px]">
                            <Pagination
                                count={productsData.totalPages}
                                page={parseInt(params.page)}
                                onChange={handlePageChange}
                                color="primary"
                                sx={{
                                    '& .MuiPaginationItem-root': {
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: '16px',
                                        '&.Mui-selected': {
                                            backgroundColor: '#e67e22',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: '#d35400',
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    )}
                </section>
            </div>

            <FooterSub />
        </>
    );
};
