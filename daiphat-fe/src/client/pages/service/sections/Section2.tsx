import { useServices } from "../../../hooks/useService";
import { Skeleton } from "@mui/material";
import { motion } from "framer-motion";
import { AppCard } from "../../../components/ui/AppCard";

interface Section2Props {
    petType: string;
}

export const Section2 = ({ petType }: Section2Props) => {
    const { data: services = [], isLoading } = useServices({ petTypes: petType });

    if (isLoading) {
        return (
            <div className="app-container mx-auto py-[100px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[40px]">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} variant="rectangular" height={400} sx={{ borderRadius: '24px' }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white relative">
            <div className="app-container mx-auto py-[60px] pb-[120px]">
                <div className="text-center mb-[60px]">
                    <div className="text-client-primary font-[700] inline-flex items-center service-sub-title py-[11px] mb-[24px]">
                        <img
                            src="https://wordpress.themehour.net/babet/wp-content/uploads/2025/08/subtitle-icon.svg"
                            alt=""
                            width={31}
                            height={24}
                        />
                        <div className="ml-[10px] uppercase tracking-widest text-[14px]">Trải nghiệm tốt nhất</div>
                    </div>
                    <h2 className="w-full text-center font-secondary text-[45px] mb-[15px] text-client-secondary">
                        Dịch vụ dành riêng cho {petType === "DOG" ? "Cún cưng" : "Mèo cưng"}
                    </h2>
                    <p className="text-[#6C6D71] mb-[18px] font-[500] text-[18px] max-w-[800px] mx-auto">
                        Mỗi bé thú cưng đều xứng đáng được chăm sóc theo cách đặc biệt nhất. Chúng mình cam kết mang đến sự thoải mái và an toàn tuyệt đối.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-[30px] relative">
                    {services.map((service: any, index: number) => (
                        <motion.div
                            key={service._id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <AppCard data={service} type="service" />
                        </motion.div>
                    ))}
                </div>

                {services.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 italic font-medium">Hiện tại chưa có dịch vụ nào cho phân loại này ạ...</p>
                    </div>
                )}
            </div>

            {/* Shapes */}
            <img src="https://wordpress.themehour.net/babet/wp-content/uploads/2025/10/shape1-17.png" alt="" className="absolute top-[10%] left-[2%] animation-shake opacity-30" width={60} />
            <img src="https://wordpress.themehour.net/babet/wp-content/uploads/2025/10/shape1-5.png" alt="" className="absolute bottom-[10%] right-[2%] animation-jumpReverseAni opacity-30" width={60} />
        </div>
    )
}
