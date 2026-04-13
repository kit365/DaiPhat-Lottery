import { useState } from "react";

export const Section3 = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        {
            question: "Nhu cầu đặc biệt của thú cưng có được đáp ứng không?",
            answer:
                "DAIPHAT luôn ưu tiên cá nhân hóa dịch vụ cho từng thú cưng, vì mỗi boss có tính cách và nhu cầu riêng. Mỗi khách hàng đều có hồ sơ riêng trên hệ thống web, lưu thông tin về giống loài, tình trạng da, sở thích, sản phẩm đã dùng và các lưu ý đặc biệt. Nhờ vậy, nhân viên có thể dễ dàng điều chỉnh quy trình tắm, cắt tỉa, hay lựa chọn sản phẩm phù hợp cho từng trường hợp, giúp boss thoải mái, an toàn và hạn chế rủi ro.",
        },
        {
            question: "Tôi nên tắm cho thú cưng bao lâu một lần?",
            answer:
                "Tần suất tắm tùy thuộc vào giống loài, loại lông và môi trường sống. Thông thường, chó nên được tắm mỗi 2–4 tuần, trong khi mèo chỉ cần tắm khi thực sự bẩn hoặc có mùi. Việc tắm quá thường xuyên có thể khiến da khô và mất lớp dầu bảo vệ tự nhiên.",
        },
        {
            question: "Nhân viên thực hiện dịch vụ cho thú cưng có chuyên môn không?",
            answer:
                "Toàn bộ nhân viên của DAIPHAT đều được đào tạo chuyên sâu theo quy trình grooming chuẩn hóa 5 bước và có kinh nghiệm trong nghề. Các groomer không chỉ nắm vững kỹ thuật mà còn được huấn luyện về tâm lý thú cưng, xử lý tình huống và kỹ năng giao tiếp với chủ nuôi. Mỗi buổi làm việc đều có camera giám sát và hình ảnh lưu trữ để đảm bảo chất lượng và minh bạch. Nhờ đó, khách hàng có thể hoàn toàn yên tâm về tay nghề và thái độ chuyên nghiệp của đội ngũ DAIPHAT.",
        },
        {
            question: "Sản phẩm nào được sử dụng trong quá trình chăm sóc – có an toàn không?",
            answer:
                "DAIPHAT chỉ sử dụng sản phẩm cao cấp và có nguồn gốc rõ ràng, phù hợp tiêu chuẩn an toàn cho thú cưng. Các dòng sữa tắm, dung dịch vệ sinh tai – mắt đều là sản phẩm hữu cơ (organic) nhập khẩu, không chứa Paraben hay Sulfate, đảm bảo an toàn cho cả thú cưng nhạy cảm. Ngoài ra, DAIPHAT còn phục vụ pate handmade nấu trực tiếp tại spa từ nguyên liệu tươi như thịt gà, cá hồi, rau củ,… giúp boss được ăn ngon, lành mạnh và đúng khẩu vị.",
        },
    ];


    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="bg-[#F6F6F6] mb-[-20px]">
            <div className="app-container w-[1344px] py-[120px] flex">
                <div className="w-[50%]">
                    {/* subtitle */}
                    <div className="text-[#F8721F] font-[700] inline-flex items-center service-sub-title py-[11px] mb-[24px]">
                        <img
                            src="https://wordpress.themehour.net/babet/wp-content/uploads/2025/08/subtitle-icon.svg"
                            alt=""
                            width={31}
                            height={24}
                        />
                        <div className="ml-[10px]">trả lời nhanh</div>
                    </div>

                    {/* title */}
                    <h2 className="w-full font-secondary text-[45px] mb-[30px]">
                        Câu hỏi thường gặp
                    </h2>

                    {/* FAQ list */}
                    <div className="flex flex-col gap-[25px]">
                        {faqs.map((item, index) => (
                            <div
                                key={index}
                                className={`bg-white pt-[25px] pb-[15px] transition-all duration-400 ease-in-out rounded-[8px] ${openIndex === index ? "shadow-md" : ""
                                    }`}
                            >
                                <div
                                    className={`service-question relative pl-[30px] pr-[55px] pb-[12px] font-[600] cursor-pointer text-[18px] text-[#02000F] flex gap-[10px] items-center select-none ${openIndex === index ? "isOpen" : ""
                                        }`}
                                    onClick={() => toggleFAQ(index)}
                                >
                                    <span>{index + 1}.</span>
                                    <span>{item.question}</span>
                                </div>

                                <div
                                    className={`mx-[30px] px-[20px] text-[#6C6D71] leading-[1.75] font-[500] overflow-hidden transition-all duration-400 ease-in-out ${openIndex === index
                                        ? "max-h-[500px] opacity-100 pb-[30px]"
                                        : "max-h-0 opacity-0"
                                        }`}
                                >
                                    {item.answer}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 pl-[90px] relative overflow-visible">
                    <div className="service-image-question absolute right-[-80px] top-[30px] w-[653px] h-[729px] rounded-[32px] overflow-hidden">
                        <img
                            src="https://wordpress.themehour.net/babet/wp-content/uploads/2025/09/faq-img-1-1.jpg"
                            alt=""
                            width={653}
                            height={729}
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
