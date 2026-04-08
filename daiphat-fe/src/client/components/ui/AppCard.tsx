import { Link } from "react-router-dom";
import dayjs from "dayjs";

interface AppCardProps {
    data: any;
    type: 'blog' | 'service';
}

export const AppCard = ({ data, type }: AppCardProps) => {
    const isBlog = type === 'blog';

    // Mapping dữ liệu chung cho cả Blog và Service
    const cardTitle = isBlog ? (data.title || data.name) : (data.name || "");
    const cardImage = isBlog
        ? (data.featuredImage || data.avatar || "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/Aristocraticpet.jpg")
        : (data.images?.[0] || "https://wordpress.themehour.net/babet/wp-content/uploads/2025/08/service-bg-1.jpg");
    const cardDesc = isBlog ? (data.description || data.excerpt) : (data.description || "");
    const cardLink = isBlog ? `/blog/detail/${data.slug}` : `/services/${data.slug}`;

    // Badge hiển thị: Ngày cho Blog, Giá cho Service
    const badgeContent = isBlog
        ? dayjs(data.publishAt || data.createdAt).format('DD [T]M')
        : (data.basePrice !== undefined
            ? (data.basePrice > 0 ? `${data.basePrice.toLocaleString("vi-VN")}đ` : "Liên hệ")
            : null);

    return (
        <div className="bg-[#e67e2026] rounded-[20px] overflow-hidden product-item transition-all duration-300 ease-linear hover:bg-client-primary group flex flex-col h-full">
            <div className="p-[20px]">
                <Link to={cardLink} className="block relative rounded-[20px] overflow-hidden aspect-[1520/800]">
                    <img
                        className="primary-image z-[10]-item w-full h-full object-cover rounded-[20px] transition-opacity duration-700 opacity-100 cursor-pointer"
                        src={cardImage}
                        alt={cardTitle}
                    />
                    {isBlog && badgeContent && (
                        <div className="date-blog absolute z-[20] top-[5%] left-[2%] bg-client-primary transition-default py-[10px] px-[16px] text-[1.125rem] leading-[1.2] text-white w-[65px] font-secondary text-center group-hover:bg-[#F7F3EB] group-hover:text-client-secondary">
                            {badgeContent}
                        </div>
                    )}
                </Link>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-[10px] flex-1">
                <div className="pl-[25px] pb-[10px] flex flex-col justify-center">
                    <Link
                        to={cardLink}
                        className="inline-block text-client-secondary text-[1.375rem] font-secondary leading-[1.4] transition-default ease-in-out group-hover:text-white hover:opacity-90 mb-[10px] line-clamp-1"
                    >
                        {cardTitle}
                    </Link>
                    <div
                        className="line-clamp-2 text-client-text group-hover:text-white transition-default ease-in-out html-content-preview"
                        dangerouslySetInnerHTML={{ __html: cardDesc }}
                    />
                </div>

                {/* Button */}
                <div className="mt-[15px]">
                    <div className="mt-[53px]">
                        <div className="w-[70px] h-[70px] pt-[10px] pl-[10px] relative rounded-tl-[30px] bg-white cart-button transition-colors duration-300">
                            <Link to={cardLink} className="w-[60px] h-[60px] rounded-full bg-client-primary text-white flex items-center justify-center duration-[375ms] ease-[cubic-bezier(0.7,0,0.3,1)] group-hover:bg-client-secondary">
                                <button className="button-watch-more-section-2 w-[50%] cursor-pointer aspect-square flex items-center justify-center  rounded-full">
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
