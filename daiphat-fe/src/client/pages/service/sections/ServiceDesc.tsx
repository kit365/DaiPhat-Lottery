import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ServiceDescProps {
    serviceName: string;
    description: string;
    procedure?: string;
}

const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export const ServiceDesc = ({ serviceName, description, procedure }: ServiceDescProps) => {
    const [activeTabKey, setActiveTabKey] = useState("description");

    const tabsData = [
        {
            label: "Thông tin dịch vụ",
            key: "description",
            content: `
                <div class="prose prose-orange max-w-none">
                    <h4 class="text-[28px] font-secondary text-client-secondary mb-6">Chi tiết về ${serviceName}</h4>
                    <div>${description || "Dịch vụ đang cập nhật chi tiết..."}</div>
                </div>
            `
        },
        {
            label: "Quy trình thực hiện",
            key: "process",
            content: procedure ? `
                <div class="prose prose-orange max-w-none">
                    <h4 class="text-[28px] font-secondary text-client-secondary mb-6">Quy trình dịch vụ</h4>
                    <div class="text-[#505050] leading-relaxed">${procedure}</div>
                </div>
            ` : `
                <div class="space-y-6">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-full bg-client-primary/10 flex items-center justify-center shrink-0 text-client-primary font-bold">1</div>
                        <div>
                            <h5 class="text-[18px] font-bold text-client-secondary mb-1">Kiểm tra & Tư vấn</h5>
                            <p class="text-gray-500">Chuyên viên sẽ kiểm tra tình trạng sức khỏe, da lông của bé để tư vấn gói chăm sóc phù hợp nhất.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-full bg-client-primary/10 flex items-center justify-center shrink-0 text-client-primary font-bold">2</div>
                        <div>
                            <h5 class="text-[18px] font-bold text-client-secondary mb-1">Thực hiện dịch vụ</h5>
                            <p class="text-gray-500">Bé sẽ được chăm sóc tỉ mỉ bởi đội ngũ giàu kinh nghiệm với các thiết bị hiện đại và mỹ phẩm cao cấp.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-full bg-client-primary/10 flex items-center justify-center shrink-0 text-client-primary font-bold">3</div>
                        <div>
                            <h5 class="text-[18px] font-bold text-client-secondary mb-1">Hoàn thiện & Bàn giao</h5>
                            <p class="text-gray-500">Sau khi hoàn tất, bé sẽ được nghỉ ngơi ngắn và xịt nước hoa cao cấp trước khi được đón về trong tình trạng hoàn hảo nhất.</p>
                        </div>
                    </div>
                </div>
            `
        },
        {
            label: "Chính sách & Lưu ý",
            key: "policies",
            content: `
                <div class="space-y-4">
                    <p><strong>Lưu ý đặt lịch:</strong> Quý khách vui lòng đặt lịch trước ít nhất 2 tiếng để DaiPhat chuẩn bị chu đáo nhất cho bé.</p>
                    <p><strong>Chính sách hủy:</strong> Vui lòng thông báo hủy hoặc dời lịch trước ít nhất 1 tiếng so với giờ hẹn.</p>
                    <p><strong>Yêu cầu sức khỏe:</strong> Để đảm bảo an toàn, DaiPhat chỉ nhận chăm sóc các bé đã được tiêm phòng đầy đủ và không có bệnh lây nhiễm cấp tính.</p>
                </div>
            `
        },
    ];

    const activeTab = tabsData.find(tab => tab.key === activeTabKey);

    return (
        <div className="px-[30px] pt-[80px] mb-[50px]">
            <div className="app-container p-[40px] rounded-[30px] bg-[#e67e201a]">
                <ul className="flex items-center gap-[45px] border-b border-[#d7d7d7]">
                    {tabsData.map((tab) => {
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

                <div className="pt-[40px] text-[16px] text-[#505050] min-h-[220px] leading-relaxed">
                    <AnimatePresence mode="wait">
                        {activeTab && (
                            <motion.div
                                key={activeTab.key}
                                variants={contentVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="max-w-none"
                                dangerouslySetInnerHTML={{ __html: activeTab.content }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
