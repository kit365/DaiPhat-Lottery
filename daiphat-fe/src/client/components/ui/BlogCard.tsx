import { Link } from "react-router-dom";
import dayjs from "dayjs";

interface BlogCardProps {
    blog: any;
}

export const BlogCard = ({ blog }: BlogCardProps) => {
    const detailUrl = `/blog/detail/${blog.slug}`;
    const formattedDate = dayjs(blog.publishAt || blog.createdAt).format('DD [T]M');

    return (
        <div className="bg-[#e67e2026] rounded-[20px] overflow-hidden product-item transition-all duration-300 ease-linear hover:bg-client-primary group">
            <div className="p-[20px]">
                <Link to={detailUrl} className="block relative rounded-[20px] overflow-hidden aspect-[1520/800]">
                    <img
                        className="primary-image z-[10]-item w-full h-full object-cover rounded-[20px] transition-opacity duration-700 opacity-100 cursor-pointer"
                        src={blog.featuredImage || blog.avatar || "https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/Aristocraticpet.jpg"}
                        alt={blog.title || blog.name}
                    />
                    <div className="date-blog absolute z-[20] top-[5%] left-[2%] bg-client-primary transition-default py-[10px] px-[16px] text-[1.125rem] leading-[1.2] text-white w-[65px] font-secondary text-center group-hover:bg-[#F7F3EB] group-hover:text-client-secondary">
                        {formattedDate}
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-[10px]">
                <div className="pl-[25px]">
                    <Link
                        to={detailUrl}
                        className="inline-block text-client-secondary text-[1.375rem] font-secondary leading-[1.4] transition-default ease-in-out group-hover:text-white hover:opacity-90 mb-[10px] line-clamp-1"
                    >
                        {blog.title || blog.name}
                    </Link>
                    <p className="line-clamp-2 text-client-text group-hover:text-white transition-default ease-in-out">
                        {blog.description || blog.excerpt}
                    </p>
                </div>

                {/* Button */}
                <div className="mt-[15px]">
                    <div className="mt-[53px]">
                        <div className="w-[70px] h-[70px] pt-[10px] pl-[10px] relative rounded-tl-[30px] bg-white cart-button">
                            <Link to={detailUrl} className="w-[60px] h-[60px] rounded-full bg-client-primary text-white flex items-center justify-center duration-[375ms] ease-[cubic-bezier(0.7,0,0.3,1)] group-hover:bg-client-secondary">
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
