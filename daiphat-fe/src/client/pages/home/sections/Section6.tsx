import { SectionHeader } from "../../../components/ui/SectionHeader"
import { Button } from "../../../components/ui/Button"

export const Section6 = () => {
    return (
        <section className="relative px-[30px] py-[150px] bg-white section-6 h-[800px] 2xl:h-[700px]">
            <div className="app-container flex">
                <div className="w-[50%] pr-[100px]">
                    <SectionHeader
                        subtitle="Giảm Giá Nhanh"
                        align="left"
                        title="Ưu Đãi Tuyệt Vời Cho Chú Cưng — Sắp Kết Thúc!"
                        desc="Nhanh tay tận hưởng những ưu đãi đặc biệt cho thú cưng của bạn. Chương trình có thời hạn, đừng bỏ lỡ cơ hội sở hữu những món đồ yêu thích với giá hời và chất lượng đảm bảo."
                    />
                    <div className="flex items-center"></div>
                    <div className="pt-[20px]">
                        <Button
                            content="Nhận ưu đãi"
                            background="bg-client-primary"
                            hoverBackground="group-hover:bg-client-secondary"
                            svgColor="text-client-primary"
                            hoverSvgColor="group-hover:text-client-secondary"
                            url="/shop"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}