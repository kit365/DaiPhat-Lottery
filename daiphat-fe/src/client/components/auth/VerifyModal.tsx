import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../../stores/useAuthStore";
import { authService } from "../../../admin/pages/authen/services/auth.service";

export const VerifyContent = () => {
    const { verificationToken, closeVerifyModal, openLoginModal } = useAuthStore();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Đang xác thực tài khoản của bạn...');
    const hasCalled = useRef(false);

    useEffect(() => {
        const verify = async () => {
            if (!verificationToken || hasCalled.current) return;
            hasCalled.current = true;
            
            try {
                // Giả lập delay một chút cho hiệu ứng rực rỡ
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const response = await authService.verifyEmail(verificationToken);
                
                if (response.isSuccess) {
                    setStatus('success');
                    setMessage('Tài khoản của bạn đã được kích hoạt thành công!');
                } else {
                    setStatus('error');
                    setMessage(response.message || 'Xác thực thất bại. Vui lòng thử lại.');
                }
            } catch (error: any) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Có lỗi xảy ra trong quá trình xác thực.');
            }
        };

        verify();
    }, [verificationToken]);

    return (
        <div className="flex flex-col w-full p-6 sm:p-8 xl:p-10 justify-center items-center text-center">
            <div className="mb-8">
                <AnimatePresence mode="wait">
                    {status === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative w-20 h-20"
                        >
                            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-[#FF6262] rounded-full animate-spin"></div>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-[#FF6262]"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="max-w-xs mx-auto">
                <h2 className="font-client-display text-2xl font-black text-[#102937] mb-2">
                    {status === 'loading' ? 'Đang xác thực' : status === 'success' ? 'Thành công!' : 'Thất bại'}
                </h2>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                    {message}
                </p>

                {status === 'success' && (
                    <button
                        onClick={() => {
                            closeVerifyModal();
                            openLoginModal();
                        }}
                        className="w-full h-12 bg-[#FF6262] text-white font-black text-md rounded-xl shadow-lg shadow-[#FF6262]/26 transition-all hover:scale-[1.01] hover:shadow-xl active:scale-95 cursor-pointer"
                    >
                        Đăng nhập ngay
                    </button>
                )}

                {status === 'error' && (
                    <button
                        onClick={closeVerifyModal}
                        className="w-full h-12 bg-slate-100 text-[#102937] font-black text-md rounded-xl transition-all hover:bg-slate-200 active:scale-95 cursor-pointer"
                    >
                        Quay về trang chủ
                    </button>
                )}
            </div>
        </div>
    );
};

export const VerifyModal = () => {
    const { isVerifyModalOpen, closeVerifyModal } = useAuthStore();

    useEffect(() => {
        if (isVerifyModalOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
        return () => { document.body.style.overflow = "unset"; };
    }, [isVerifyModalOpen]);

    if (!isVerifyModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-md transition-all" onClick={closeVerifyModal}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-[450px] w-full max-h-[90vh] flex flex-col pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 flex flex-col items-center justify-center min-h-[350px]">
                    <VerifyContent />
                </div>
            </motion.div>
        </div>
    );
};
