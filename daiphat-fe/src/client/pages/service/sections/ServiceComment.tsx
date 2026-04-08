import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useState } from "react";

export const ServiceComment = () => {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);

    return (
        <div>
            <div className="app-container">
                <h2 className="text-[35px] 2xl:text-[28px] font-secondary text-client-secondary">Đánh giá từ khách hàng</h2>
                <ul className="mb-[60px]">
                    <li className="py-[30px] border-b border-[#10293726] mb-[30px] flex">
                        <div className="flex">
                            <img src="https://secure.gravatar.com/avatar/4b4d70c085ba692974261304da0860f360cb1f3a616203402e9e19f2d3bda5f8?s=60&d=mm&r=g" alt="" width={60} height={60} className="w-[60px] h-[60px] rounded-[10px] border border-[#e1dde7]" />
                            <div className="ml-[20px] w-[74.2%]">
                                <div className="flex items-center mb-[10px]">
                                    <strong className="font-secondary text-[16px] text-client-secondary">Mai Anh</strong>
                                    <span className="text-client-text mx-[5px]">-</span>
                                    <span className="text-client-text text-[14px]">15 / 10 / 2025</span>
                                </div>
                                <p className="text-client-text leading-[1.8]">Dịch vụ Spa cho cún ở đây thật sự chất lượng! Bé nhà mình thường rất nhát nhưng đến đây các bạn kỹ thuật viên rất nhẹ nhàng nên bé rất hợp tác. Tắm xong bé thơm tho, lông mượt hẳn. Rất đáng trải nghiệm ạ! 🌟</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                                <StarIcon
                                    key={i}
                                    sx={{
                                        fontSize: "20px !important",
                                        color: "#ffbb00 !important",
                                    }}
                                />
                            ))}
                        </div>
                    </li>
                    <li className="py-[30px] border-b border-[#10293726] mb-[30px] flex">
                        <div className="flex">
                            <img src="https://secure.gravatar.com/avatar/4b4d70c085ba692974261304da0860f360cb1f3a616203402e9e19f2d3bda5f8?s=60&d=mm&r=g" alt="" width={60} height={60} className="w-[60px] h-[60px] rounded-[10px] border border-[#e1dde7]" />
                            <div className="ml-[20px] w-[74.2%]">
                                <div className="flex items-center mb-[10px]">
                                    <strong className="font-secondary text-[16px] text-client-secondary">Hoàng Minh</strong>
                                    <span className="text-client-text mx-[5px]">-</span>
                                    <span className="text-client-text text-[14px]">20 / 10 / 2025</span>
                                </div>
                                <p className="text-client-text leading-[1.8]">Mình hay mang mèo đến đây tắm Ozone. Phòng Spa sạch sẽ, không có mùi hôi. Các bạn nhân viên tư vấn nhiệt tình về tình trạng da lông của bé. Giá cả hợp lý so với mặt bằng chung. Chắc chắn sẽ quay lại! 💯</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                                <StarIcon
                                    key={i}
                                    sx={{
                                        fontSize: "20px !important",
                                        color: "#ffbb00 !important",
                                    }}
                                />
                            ))}
                        </div>
                    </li>
                </ul>
            </div>

            <form className="app-container mt-[70px] pb-[100px]">
                <h3 className="text-[30px] 2xl:text-[24px] font-secondary text-client-secondary mb-[20px]">Viết đánh giá của bạn</h3>
                <p className="text-client-text font-[500] mb-[20px]">Các trường bắt buộc được đánh dấu <span className="text-[#FF0000]">*</span></p>
                <label className="text-client-text block font-[500] mb-[5px]">Đánh giá của bạn</label>
                <div className="flex mb-[20px]">
                    {[...Array(5)].map((_, i) => {
                        const index = i + 1;
                        const isActive = index <= (hoverRating || rating);

                        return (
                            <div
                                key={index}
                                onMouseEnter={() => setHoverRating(index)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(index)}
                                className="cursor-pointer"
                            >
                                {isActive ? (
                                    <StarIcon
                                        sx={{
                                            fontSize: "28px",
                                            color: "#FF6262",
                                        }}
                                    />
                                ) : (
                                    <StarBorderIcon
                                        sx={{
                                            fontSize: "28px",
                                            color: "#ccc",
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <label className="text-client-text font-[500] block mb-[5px]" htmlFor="comment">Nhận xét của bạn <span className="text-[#FF0000]">*</span></label>
                <textarea name="comment" id="comment" className="outline-none text-client-text h-[150px] w-full rounded-[20px] border border-[#d7d7d7] bg-white py-[16px] px-[32px] mb-[20px]"></textarea>
                <div className="flex gap-[20px] mb-[20px]">
                    <div className="flex-1">
                        <label className="text-client-text font-[500] block mb-[5px]" htmlFor="fullname">Tên <span className="text-[#FF0000]">*</span></label>
                        <input type="text" id="fullname" className="outline-none text-client-text h-[58px] w-full rounded-[40px] border border-[#d7d7d7] bg-white py-[16px] px-[32px]" />
                    </div>
                    <div className="flex-1">
                        <label className="text-client-text font-[500] block mb-[5px]" htmlFor="email">Email <span className="text-[#FF0000]">*</span></label>
                        <input type="email" id="email" className="outline-none text-client-text h-[58px] w-full rounded-[40px] border border-[#d7d7d7] bg-white py-[16px] px-[32px]" />
                    </div>
                </div>
                <button type="submit" className="min-w-[150px] cursor-pointer bg-client-primary hover:bg-client-secondary transition-default text-white font-secondary px-[40px] py-[16px] rounded-[50px]">Gửi đánh giá</button>
            </form>
        </div>
    )
}
