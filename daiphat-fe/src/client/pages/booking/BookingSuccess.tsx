import { motion } from "framer-motion";
import { CheckCircle, Home, History } from "lucide-react";
import { Link } from "react-router-dom";
import { FooterSub } from "../../components/layouts/FooterSub";

export const BookingSuccessPage = () => {
    return (
        <div className="min-h-screen bg-[#FDFCFB] pt-[120px]">
            <div className="app-container py-20">
                <div className="max-w-[700px] mx-auto text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12 }}
                        className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-green-200"
                    >
                        <CheckCircle className="w-12 h-12" />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-[2rem] lg:text-[2.5rem] font-black text-[#181818] mb-4"
                    >
                        Đặt lịch thành công!
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-[1rem] text-gray-500 mb-12 font-medium"
                    >
                        Cảm ơn bạn đã tin tưởng DaiPhat. Lịch hẹn của bạn đã được ghi nhận vào hệ thống.
                        Chúng mình sẽ sớm kiểm tra và sẵn sàng đón chờ bé yêu nha!
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <Link
                            to="/dashboard/bookings"
                            className="flex items-center justify-center gap-3 bg-[#181818] text-white py-5 rounded-[24px] font-bold hover:scale-[1.02] transition-all"
                        >
                            <History className="w-5 h-5" />
                            Xem lịch sử đặt chỗ
                        </Link>
                        <Link
                            to="/"
                            className="flex items-center justify-center gap-3 bg-white text-[#181818] border-2 border-[#eee] py-5 rounded-[24px] font-bold hover:bg-gray-50 transition-all"
                        >
                            <Home className="w-5 h-5" />
                            Về trang chủ
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-20 p-8 bg-client-primary/5 rounded-[40px] border-2 border-dashed border-client-primary/20 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h4 className="text-[1.125rem] font-bold text-client-primary mb-2">Bạn có biết?</h4>
                            <p className="text-[0.875rem] text-client-secondary font-medium">
                                Bạn có thể theo dõi trạng thái lịch hẹn và nhận thông báo nhắc lịch ngay tại Dashboard của mình đó!
                            </p>
                        </div>
                        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-client-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700" />
                    </motion.div>
                </div>
            </div>
            <FooterSub />
        </div>
    );
};
