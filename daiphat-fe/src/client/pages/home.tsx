import { useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/layout/header";
import { PartnerLogos } from "../components/layout/PartnerLogos";
import { useAuthStore } from "../../stores/useAuthStore";

const trustItems = ["Uy tín", "An toàn", "Minh bạch"];

export const HomePage = () => {
  const { openLoginModal, openRegisterModal, openVerifyModal } = useAuthStore();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("verify_token");
    if (token) {
      openVerifyModal(token);
      // Clean URL params to keep it professional
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, openVerifyModal]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-linear-to-b from-[#fffafa] via-white to-[#fff7f4] text-client-ink font-client-main">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.028] bg-[url('data:image/svg+xml,%3Csvg_viewBox=%270_0_200_200%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter_id=%27n%27%3E%3CfeTurbulence_type=%27fractalNoise%27_baseFrequency=%27.65%27_numOctaves=%273%27_stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect_width=%27100%25%27_height=%27100%25%27_filter=%27url(%23n)%27/%3E%3C/svg%3E')]" aria-hidden="true" />
      <Header />

      <main className="relative z-1 max-w-[1240px] mx-auto px-6">
        <section className="min-h-[calc(100vh-112px)] grid grid-cols-1 lg:grid-cols-[0.96fr_1.04fr] items-center gap-10 lg:gap-20 py-14 lg:py-24" aria-labelledby="client-home-title">
          <motion.div
            className="max-w-screen-sm lg:text-left text-center mx-auto lg:mx-0"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
            }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 h-[38px] bg-[#FFF0F0] border border-[#FF6262]/20 rounded-full text-client-primary-strong text-[11px] font-black uppercase tracking-[0.14em] mb-6 mx-auto lg:mx-0 shadow-sm" 
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            >
              <span className="w-2 h-2 rounded-full bg-[#FFB800] shadow-[0_0_0_5px_rgba(255,184,0,0.2)]" />
              Hệ thống mua vé số minh bạch
            </motion.div>

            <motion.h1 
              id="client-home-title" 
              className="font-client-display text-5xl sm:text-7xl lg:text-[88px] leading-[1.1] lg:leading-[0.98] tracking-[-0.045em] font-extrabold text-client-navy m-0"
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            >
              Chạm vận may, nhận thưởng cùng Đại Phát.
            </motion.h1>

            <motion.p 
              className="text-lg lg:text-xl text-client-text leading-relaxed mt-7 max-w-[580px] mx-auto lg:mx-0"
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            >
              Mua vé online, dò kết quả nhanh và quản lý giải thưởng an toàn trên một nền tảng dành cho người chơi hiện đại.
            </motion.p>

            <motion.div 
              className="flex flex-wrap justify-center lg:justify-start gap-3.5 mt-9"
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            >
              <button onClick={openLoginModal} className="min-h-[56px] px-8 flex items-center justify-center gap-3 rounded-xl bg-[#FF6262] text-white font-bold shadow-lg shadow-[#FF6262]/26 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 cursor-pointer">
                Mua vé ngay
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={openRegisterModal} className="min-h-[56px] px-8 flex items-center justify-center gap-3 rounded-xl bg-white border-2 border-[#102937]/10 text-[#102937] font-bold transition-all hover:border-[#102937]/20 active:scale-95 cursor-pointer">
                Tạo tài khoản
              </button>
            </motion.div>

            <motion.div 
              className="flex flex-wrap justify-center lg:justify-start gap-5 lg:gap-8 mt-14 pt-8 border-t border-black/8"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            >
              {trustItems.map((item) => (
                <div key={item} className="inline-flex items-center gap-2.5 text-black/52 text-xs font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-client-gold" />
                  {item}
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="relative min-h-[560px] lg:min-h-[660px] flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="absolute inset-[8%_-6%_0_10%] rounded-full bg-radial-gradient from-client-gold/26 via-client-primary/8 to-transparent blur-[36px]" aria-hidden="true" />
            <div className="relative w-full max-w-[560px] h-full min-h-[560px] max-h-[72vh] rounded-client-xl bg-client-navy overflow-hidden shadow-2xl">
              <img src="/assets/images/hero_visual.png" alt="Tấm vé số may mắn Đại Phát" className="w-full h-full object-cover block" />
              <div className="absolute inset-0 bg-linear-to-b from-black/4 via-black/32 to-black/82" />
              <div className="absolute left-8 right-8 bottom-8.5 flex items-center justify-between gap-5 p-5 border border-white/18 rounded-client-md bg-client-navy/48 backdrop-blur-xl text-white">
                <div>
                  <span className="block text-white/64 text-[11px] font-extrabold tracking-widest uppercase">Trúng thưởng trực tiếp</span>
                  <strong className="block mt-1.5 text-lg">Khai lộc giờ vàng</strong>
                </div>
                <b className="shrink-0 px-3 py-2 rounded-full bg-client-gold/18 text-client-gold text-xs underline-offset-4">LIVE 18:30</b>
              </div>
            </div>
            <div className="absolute top-14 -right-4 w-[210px] p-4.5 bg-white rounded-client-md shadow-xl">
              <span className="text-client-muted text-[11px] font-extrabold tracking-wider uppercase">Jackpot hôm nay</span>
              <strong className="block mt-2 text-client-primary-strong text-2xl leading-none font-bold">128.609.000đ</strong>
              <p className="m-0 mt-2 text-[#505050] text-xs">Cập nhật theo từng kỳ quay</p>
            </div>
          </motion.div>
        </section>

        <PartnerLogos />
      </main>
    </div>
  );
};
