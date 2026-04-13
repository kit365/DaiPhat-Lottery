import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductDescProps {
    description: string;
}

const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export const ProductDesc = ({ description }: ProductDescProps) => {
    const [activeTabKey, setActiveTabKey] = useState("description");

    const productTabsData = [
        {
            label: "Mô tả sản phẩm",
            key: "description",
            content: description || "Chưa có văn bản mô tả cho sản phẩm này."
        },
        {
            label: "Giao hàng & Trả hàng",
            key: "delivery_returns",
            content: `
                <div class="space-y-4">
                    <p><strong>Chính Sách Giao Hàng:</strong> Chúng tôi hỗ trợ giao hàng tận nơi trên toàn quốc. <strong>Phí vận chuyển sẽ do quý khách chi trả</strong> và được tính toán dựa trên địa chỉ nhận hàng cụ thể, hệ thống sẽ hiển thị phí ship chính xác tại bước thanh toán.</p>
                    <p><strong>Quy Định Đổi Trả:</strong> Quý khách vui lòng <strong>kiểm tra sản phẩm ngay khi nhận hàng (Đồng kiểm)</strong>. Chúng tôi hỗ trợ đổi trả hoặc hoàn tiền ngay tại thời điểm giao nếu sản phẩm bị hư hỏng, không đúng mẫu mã hoặc có lỗi từ nhà sản xuất. Sau khi đã ký nhận hàng, cửa hàng không hỗ trợ đổi trả đối với các khiếu nại phát sinh sau đó.</p>
                </div>
            `
        },
    ];

    const activeTab = productTabsData.find(tab => tab.key === activeTabKey);

    return (
        <div className="px-[30px] pt-[80px] mb-[50px]">
            <div className="app-container p-[40px] rounded-[30px] bg-[#e67e201a]">
                <ul className="flex items-center gap-[45px] border-b border-[#d7d7d7]">
                    {productTabsData.map((tab) => {
                        const isActive = tab.key === activeTabKey;
                        return (
                            <li
                                key={tab.key}
                                className={`
                                    relative 
                                    text-[21px] 
                                    font-secondary 
                                    font-[900]
                                    px-[10px] 
                                    pb-[20px] 
                                    cursor-pointer 
                                    transition-all duration-300
                                    before:content-[""] 
                                    before:absolute 
                                    before:bottom-[-2px] 
                                    before:left-0 
                                    before:h-[3px] 
                                    before:bg-client-primary 
                                    before:z-[10] 
                                    before:transition-all 
                                    before:duration-300
                                    ${isActive
                                        ? 'text-client-primary font-bold before:w-full'
                                        : 'text-client-secondary hover:text-client-primary before:w-0 hover:before:w-full'
                                    }
                                `}
                                onClick={() => setActiveTabKey(tab.key)}
                            >
                                {tab.label}
                            </li>
                        );
                    })}
                </ul>

                <div className="pt-[40px] text-[16px] text-[#505050] min-h-[200px] leading-relaxed">
                    <AnimatePresence mode="wait">
                        {activeTab && (
                            <motion.div
                                key={activeTab.key}
                                variants={contentVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="prose max-w-none"
                                dangerouslySetInnerHTML={{ __html: activeTab.content }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
