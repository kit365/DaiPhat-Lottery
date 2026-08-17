"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useRouter } from "next/navigation";
import { authService } from "@/shared/auth/services/auth.service";
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { VERIFY_MODAL_BACKGROUND } from '@/client/constants/clientBannerAssets';

export const VerifyContent = () => {
    const router = useRouter();
    const { verificationToken, closeVerifyModal } = useAuthStore();
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
        <div
            className="flex flex-col w-full h-full min-h-[420px] relative transition-all duration-500"
            style={status === 'success' ? {
                backgroundImage: `url('${VERIFY_MODAL_BACKGROUND}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            } : {}}
        >
            {/* Close Button */}
            <button
                onClick={closeVerifyModal}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors z-10 bg-white/50 backdrop-blur-sm cursor-pointer"
            >
                <CloseIcon sx={{ fontSize: 18 }} />
            </button>

            <div className="flex flex-col items-center justify-center flex-1 p-6 sm:p-8">
                <AnimatePresence mode="wait">
                    {status === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex flex-col items-center justify-center w-full h-full"
                        >
                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-[#d91d1e] rounded-full animate-spin"></div>
                            </div>
                            <h2 className="text-2xl font-bold text-[#102937] mb-2">Đang xác thực</h2>
                            <p className="text-slate-500 font-medium text-[15px] text-center">{message}</p>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-end w-full h-full pt-[120px] pb-2"
                        >
                            <div className="flex items-center gap-3 mb-2 mt-4">
                                {/* Left dashes */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#df1b1c]">
                                    <path d="M14 6L18 8M12 12H20M14 18L18 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80" />
                                </svg>

                                <h2 className="text-3xl font-black text-[#df1b1c]">Thành công!</h2>

                                {/* Right dashes */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#df1b1c] scale-x-[-1]">
                                    <path d="M14 6L18 8M12 12H20M14 18L18 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80" />
                                </svg>
                            </div>

                            <p className="text-[#4A5568] font-medium text-[15px] mb-6 text-center px-4">
                                {message}
                            </p>

                            <button
                                onClick={() => {
                                    closeVerifyModal();
                                    router.push("/login");
                                }}
                                className="w-[85%] max-w-[300px] h-[50px] bg-[#df1b1c] text-white font-bold text-[16px] rounded-[12px] shadow-[0_8px_20px_rgba(217,29,30,0.3)] transition-all hover:bg-[#b91819] hover:shadow-[0_8px_25px_rgba(217,29,30,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
                            >
                                Đăng nhập ngay
                                <ArrowForwardIcon sx={{ fontSize: 20 }} />
                            </button>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center w-full h-full"
                        >
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-[#d91d1e] mb-6">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-[#102937] mb-2">Thất bại</h2>
                            <p className="text-slate-500 font-medium text-[15px] text-center mb-8">{message}</p>
                            <button
                                onClick={closeVerifyModal}
                                className="w-full max-w-[280px] h-12 bg-slate-100 text-[#102937] font-bold text-[16px] rounded-xl transition-all hover:bg-slate-200 active:scale-95 cursor-pointer"
                            >
                                Quay về trang chủ
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm transition-all">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-[460px] flex flex-col pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <VerifyContent />
            </motion.div>
        </div>
    );
};
