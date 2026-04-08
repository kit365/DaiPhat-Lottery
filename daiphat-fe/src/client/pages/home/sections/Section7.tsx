import { Button } from "../../../components/ui/Button"
import { ProductCard } from "../../../components/ui/ProductCard";
import { SaleOff } from "../../../components/ui/SaleOff"
import { SectionHeader } from "../../../components/ui/SectionHeader"
import { useProducts } from "../../../hooks/useProduct";
import { Skeleton } from "@mui/material";

export const Section7 = () => {
    const { data: productsData, isLoading } = useProducts({
        limit: 3,
        sortKey: "createdAt",
        sortValue: "desc"
    });

    const products = productsData?.products || [];

    return (
        <section className="relative px-[30px] py-[120px]">
            <div className="app-container flex gap-[30px]">
                <div className="w-[63.5%]">
                    <SectionHeader
                        subtitle="Đồ Dùng Thú Cưng Thiết Yếu"
                        title="Sản Phẩm Yêu Thích"
                        align="left"
                    />
                    <div className="grid grid-cols-3 gap-[30px] mt-[50px]">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, idx) => (
                                <div key={idx} className="space-y-4">
                                    <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: '20px' }} />
                                    <Skeleton variant="text" width="60%" height={30} />
                                    <Skeleton variant="text" width="40%" height={20} />
                                </div>
                            ))
                        ) : products.map((item: any) => (
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
                        ))}
                    </div>
                </div>
                <div className="flex-1">
                    <div
                        className="flex flex-col gap-[30px] justify-end bg-center bg-cover bg-no-repeat w-full h-full rounded-[30px] p-[40px] relative bg-image-section-7"
                        style={{
                            backgroundImage: "url('https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/05/h1-Product-imgbox.jpg')"
                        }}
                    >
                        <SaleOff content="20% OFF" backgroundColor="bg-[#FFF3E2]" textColor="text-client-secondary" />
                        <h2 className="text-white text-[40px] leading-[1.2] font-secondary relative">Điểm Đến Cao Cấp Cho Người Yêu Thú Cưng</h2>
                        <div className="relative">
                            <Button
                                content="Xem tất cả sản phẩm"
                                hoverBackground="group-hover:bg-client-primary"
                                textColor="text-client-secondary"
                                hoverTextColor="group-hover:text-white"
                                iconColor="before:bg-client-secondary after:bg-client-secondary"
                                hoverIconColor="hover:before:bg-white hover:after:bg-white"
                                url="/shop"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}