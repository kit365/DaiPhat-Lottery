import { Navigation } from "swiper/modules";
import { ProductCard } from "../../../components/ui/ProductCard"
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from "swiper";
import { useRef, useMemo } from "react";
import { useProducts } from "../../../hooks/useProduct";
import { Skeleton } from "@mui/material";

interface ProductRelatedProps {
    productId: string;
    categoryIds: string[];
}

export const ProductRelated = ({ productId, categoryIds }: ProductRelatedProps) => {
    const prevButtonRef = useRef<HTMLDivElement>(null);
    const nextButtonRef = useRef<HTMLDivElement>(null);

    const { data: productsData, isLoading } = useProducts({
        category: categoryIds,
        limit: 13, // Fetch one extra since we'll filter out the current product
    });

    const relatedProducts = useMemo(() => {
        if (!productsData?.products) return [];
        return productsData.products.filter((p: any) => p._id !== productId).slice(0, 12);
    }, [productsData, productId]);

    if (isLoading) {
        return (
            <div className="app-container pb-[150px] 2xl:pb-[120px]">
                <h2 className="text-[35px] 2xl:text-[17.5px] font-secondary text-client-secondary mb-[40px]">Sản phẩm liên quan</h2>
                <div className="grid grid-cols-4 gap-[30px]">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} variant="rectangular" height={300} sx={{ borderRadius: '20px' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (relatedProducts.length === 0) return null;

    return (
        <div className="app-container pb-[150px] 2xl:pb-[120px] relative">
            <h2 className="text-[35px] 2xl:text-[17.5px] font-secondary text-client-secondary mb-[40px]">Sản phẩm liên quan</h2>
            <div className="flex gap-[10px] absolute top-[0] right-[30px] z-10">
                <div ref={prevButtonRef} className="w-[40px] h-[40px] rounded-full bg-client-primary hover:bg-client-secondary cursor-pointer transition-default flex items-center justify-center prev-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </div>
                <div ref={nextButtonRef} className="w-[40px] h-[40px] rounded-full bg-client-primary hover:bg-client-secondary cursor-pointer transition-default flex items-center justify-center next-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </div>
            </div>

            <Swiper
                modules={[Navigation]}
                slidesPerView={4}
                spaceBetween={30}
                breakpoints={{
                    320: { slidesPerView: 1.5, spaceBetween: 15 },
                    640: { slidesPerView: 2.5, spaceBetween: 20 },
                    1024: { slidesPerView: 4, spaceBetween: 30 }
                }}
                navigation={{
                    prevEl: prevButtonRef.current,
                    nextEl: nextButtonRef.current,
                }}
                onBeforeInit={(swiper: SwiperType) => {
                    if (
                        swiper.params.navigation &&
                        typeof swiper.params.navigation !== "boolean"
                    ) {
                        swiper.params.navigation.prevEl = prevButtonRef.current;
                        swiper.params.navigation.nextEl = nextButtonRef.current;
                    }
                }}
                className="mySwiper"
            >
                {relatedProducts.map((item: any) => (
                    <SwiperSlide key={item._id}>
                        <ProductCard
                            product={{
                                id: item._id,
                                title: item.name,
                                price: `${item.priceNew.toLocaleString('vi-VN')}đ`,
                                primaryImage: item.images?.[0],
                                secondaryImage: item.images?.[1] || item.images?.[0],
                                rating: 5, // We can calculate this from reviews if needed
                                isSale: item.discount > 0,
                                url: `/product/detail/${item.slug}`,
                            }}
                            rawData={item}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}
