import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Ticket } from "lucide-react";
import { useSettingGeneral } from "../../hooks/useSettings";

const DaiPhatLogo = () => (
    <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 bg-gradient-to-br from-client-primary to-[#ff8080] rounded-xl flex items-center justify-center shadow-lg shadow-client-primary/20 hover:scale-105 transition-transform duration-300">
            <Ticket className="text-white" size={24} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
            <span className="text-client-secondary font-black text-2xl leading-none tracking-tight">
                ĐẠI <span className="text-client-primary">PHÁT</span>
            </span>
            <span className="text-[10px] text-client-text uppercase font-bold tracking-[0.2em] opacity-60">
                Lottery Platform
            </span>
        </div>
    </div>
);

export const NotFound: React.FC = () => {
    const { data: general } = useSettingGeneral();
    const navigate = useNavigate();

    // NOTE: Project uses Desktop-First (max-width) breakpoints:
    // lg = ≤1024px, md = ≤767px, sm = ≤479px
    // Default (no prefix) = Desktop (>1440px) baseline

    const ballFloat = (delay: number) => ({
        y: [0, -18, 0],
        transition: { duration: 2.8, repeat: Infinity, delay, ease: "easeInOut" },
    });

    const catFloat = {
        y: [0, -10, 0],
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
    };

    return (
        <main className="min-h-screen bg-white relative overflow-x-hidden flex items-center justify-center p-8 md:p-4 antialiased">
            {/* Subtle background tint */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,98,98,0.05),transparent_60%)] pointer-events-none" />

            {/* 
                Main layout container: 
                Horizontal on Desktop & Laptop (1024px)
                Centered Text-only Content on Mobile (md ≤767px)
            */}
            <div className="app-container relative z-10 flex flex-row md:flex-col items-center justify-between gap-12 lg:gap-6 py-12 md:py-6 px-4 md:px-0 text-left md:text-center">

                {/* ── LEFT/CENTER: Text Content ── */}
                <div className="flex-[1.5] flex flex-col items-start md:items-center min-w-0">
                    <div className="mb-12 lg:mb-10 md:mb-8">
                        <Link to="/">
                            <DaiPhatLogo />
                        </Link>
                    </div>

                    <h1 className="font-secondary text-client-secondary text-[56px] leading-[1.1] lg:text-[42px] md:text-[36px] sm:text-[30px] mb-5 max-w-[520px]">
                        Oops! Con số <br className="md:hidden" />
                        may mắn của <br className="md:hidden" />
                        bạn <span className="text-client-primary">không ở đây.</span>
                    </h1>

                    <p className="text-client-text text-[18px] lg:text-[16px] md:text-[15px] leading-[1.6] mb-10 max-w-[520px] md:max-w-full opacity-90">
                        Có vẻ như trang bạn đang tìm kiếm đã trúng giải "biến mất".
                        Đừng lo, hãy thử vận may lại ở trang chủ nhé!
                    </p>

                    <div className="flex flex-row sm:flex-col items-center gap-4 w-full max-w-[520px]">
                        <Link to="/" className="flex-1 sm:w-full">
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: "#FF4545", boxShadow: "0 10px 30px -10px rgba(255,98,98,0.4)" }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-[54px] flex items-center justify-center gap-2.5 lg:gap-2 bg-client-primary text-white font-semibold text-[15px] lg:text-[14px] tracking-wide rounded-full transition-all shadow-[0_8px_20px_-6px_rgba(255,98,98,0.3)] whitespace-nowrap"
                            >
                                <Home size={18} strokeWidth={2.5} />
                                <span>Về Trang Chủ</span>
                            </motion.button>
                        </Link>

                        <div className="flex-1 sm:w-full">
                            <motion.button
                                onClick={() => navigate(-1)}
                                whileHover={{ scale: 1.02, backgroundColor: "rgba(16,41,55,0.03)", borderColor: "rgba(16,41,55,0.4)" }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-[54px] flex items-center justify-center gap-2.5 lg:gap-2 bg-transparent text-client-secondary border-2 border-client-secondary/15 font-semibold text-[15px] lg:text-[14px] tracking-wide rounded-full transition-all whitespace-nowrap"
                            >
                                <ArrowLeft size={18} strokeWidth={2.5} />
                                <span>Trở về trang trước</span>
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Illustration Section ── */}
                {/* Visible on Desktop, HIDDEN ON MOBILE (md) only */}
                <div className="flex-1 relative flex md:hidden items-center justify-end md:justify-center min-h-[400px] lg:min-h-[350px] min-w-0">
                    <div className="relative w-full max-w-[440px] lg:max-w-[360px] aspect-square flex items-center justify-center">

                        {/* Background glow */}
                        <div className="absolute inset-0 bg-client-primary/10 blur-[80px] rounded-full scale-110 pointer-events-none" />

                        {/* Illustration Container */}
                        <motion.div
                            animate={catFloat}
                            className="relative z-10 w-[80%] h-[80%] rounded-[32px] bg-client-secondary/[0.01] border border-client-secondary/5 shadow-xl backdrop-blur-[2px]"
                        >
                            <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpwldgC-JvWM5CI8cyuHtn3FX3wsqKxnZLl-oHeK87ZtWt3UIi4KfjPwd_KlJh4RhZ_C9udq5Fs4fh4rFQmuEHfXH1_XT976zJkr2iusVf-OttV6_oQB5f4PKH-RIPKPHxD16MCioT1ukEfq3OwoYqfpBirvsv3BQMwamdNr4gpjdWcxs2B4Z9q1c6yvzn0U8hrQTeHaTLlNGxYZd7Ib0YjVKkdijBAXmiILSeNrGB9zouQvTLTwmtPJ1bhFOq7j75Y7AvfL9yn64"
                                alt="404 Illustration"
                                className="w-full h-full object-cover rounded-[32px]"
                            />

                            {/* Floating "404" Balls — Visible on Desktop, HIDDEN ON MOBILE (md) */}
                            <motion.div
                                animate={ballFloat(0)}
                                className="absolute -top-6 -left-6 z-30 w-[24%] aspect-square rounded-full bg-client-primary shadow-lg border-[3px] border-white/60 flex items-center justify-center md:hidden"
                            >
                                <span className="text-white font-black text-[clamp(16px,4vw,32px)]">4</span>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
                            </motion.div>

                            <motion.div
                                animate={ballFloat(0.6)}
                                className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-30 w-[24%] aspect-square rounded-full bg-client-primary shadow-lg border-[3px] border-white/60 flex items-center justify-center md:hidden"
                            >
                                <span className="text-white font-black text-[clamp(16px,4vw,32px)]">0</span>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
                            </motion.div>

                            <motion.div
                                animate={ballFloat(1.2)}
                                className="absolute top-[20%] -right-6 z-30 w-[24%] aspect-square rounded-full bg-client-primary shadow-lg border-[3px] border-white/60 flex items-center justify-center md:hidden"
                            >
                                <span className="text-white font-black text-[clamp(16px,4vw,32px)]">4</span>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
                            </motion.div>
                        </motion.div>
                    </div>
                </div>

            </div>
        </main>
    );
};
