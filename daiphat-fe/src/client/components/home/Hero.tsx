<<<<<<< HEAD
import { getImageProps } from "next/image";
import imageLoader from "@/utils/imageLoader";
=======
import Image, { getImageProps } from "next/image";
>>>>>>> f5115bf9 (chore: re-apply origin/feature/dp-37-tickets changes (UI standardize, logo, NextJS refactor))
import { motion } from "framer-motion";
import { useAuthStore } from "../../../stores/useAuthStore";

// Configuration constants for easier maintenance and cleaner JSX
const HERO_CONTENT = {
  heading: {
    line1: "Mua vé số online",
    line2: "Săn lộc vàng",
    line3: "Trúng lớn mỗi ngày"
  },
  subtitle: "Uy Tín • An Toàn • Minh Bạch. Trải nghiệm mua vé nhanh chóng và tiện lợi ngay hôm nay!",
  cta: "Mua vé ngay - Chọn số may mắn",
  images: {
    desktop: "/assets/images/hero_laptop.JPEG",
    mobile: "/assets/images/hero_mobile.JPEG"
  }
};

export const Hero = () => {
  const { openLoginModal } = useAuthStore();

<<<<<<< HEAD
  const commonProps = { alt: "", fill: true, priority: true, sizes: "100vw", loader: imageLoader };
=======
  const commonProps = { alt: "", fill: true, priority: true, sizes: "100vw" };
>>>>>>> f5115bf9 (chore: re-apply origin/feature/dp-37-tickets changes (UI standardize, logo, NextJS refactor))
  const { props: { srcSet: desktopSrcSet } } = getImageProps({ ...commonProps, src: HERO_CONTENT.images.desktop });
  const { props: { srcSet: mobileSrcSet, ...restMobileProps } } = getImageProps({ ...commonProps, src: HERO_CONTENT.images.mobile });

  return (
    <section 
      className="relative w-full lg:h-[650px] flex flex-col lg:block bg-[#F4F6F8] lg:bg-transparent overflow-hidden" 
      aria-labelledby="hero-heading"
    >
      {/* Responsive Image - Background visuals are decorative, text conveys the message */}
      <div className="relative w-full h-[380px] sm:h-[500px] lg:h-full lg:absolute lg:inset-0 lg:z-0">
        <picture className="w-full h-full block">
          <source media="(min-width: 1024px)" srcSet={desktopSrcSet} />
          <source media="(max-width: 1023px)" srcSet={mobileSrcSet} />
          <img 
            {...restMobileProps}
            aria-hidden="true"
            className="w-full h-full object-cover object-[center_15%] lg:object-[right_22%] block" 
          />
        </picture>
        {/* Fade transition for mobile only */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F4F6F8] to-transparent lg:hidden pointer-events-none" />
      </div>

      {/* Content Overlay - Floating Card on mobile, transparent left-aligned on desktop */}
      <div className="relative z-10 w-full px-4 sm:px-8 -mt-20 sm:-mt-28 lg:mt-0 lg:h-full lg:max-w-[1440px] lg:mx-auto lg:px-10 lg:flex lg:items-center">
        
        {/* Text Container Card */}
        <div className="w-full max-w-[100%] sm:max-w-[540px] lg:max-w-[500px] xl:max-w-[700px] mx-auto lg:mx-0 bg-gradient-to-b from-[#ee1314] to-[#B71C1C] lg:bg-none rounded-[28px] lg:rounded-none p-7 sm:p-10 lg:p-0 shadow-[0_20px_50px_rgba(230,15,20,0.25)] lg:shadow-none border border-white/20 lg:border-none text-white text-center lg:text-left flex flex-col items-center lg:items-start transition-all font-client-main">
          
          {/* Main Heading - Linked to section via aria-labelledby */}
          <motion.h1 
            id="hero-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-[26px] sm:text-[32px] lg:text-[40px] xl:text-[54px] font-client-display font-black leading-[1.25] lg:leading-[1.2] xl:leading-[1.15] tracking-tight mb-4 uppercase drop-shadow-xl"
          >
            <span className="bg-gradient-to-b from-[#FFF2B2] via-[#FFD700] to-[#F9A826] text-transparent bg-clip-text filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
              {HERO_CONTENT.heading.line1}<br className="hidden lg:block" />
              {' '}{HERO_CONTENT.heading.line2}<br className="hidden lg:block" />
              {' '}{HERO_CONTENT.heading.line3}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[19px] font-medium opacity-95 mb-8 w-full lg:max-w-[450px] xl:max-w-[580px] leading-relaxed drop-shadow-md"
          >
            {HERO_CONTENT.subtitle}
          </motion.p>

          {/* CTA Button - Wired to openLoginModal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="w-full lg:w-auto"
          >
            <button 
              onClick={openLoginModal}
              className="w-full lg:w-auto whitespace-nowrap inline-flex items-center justify-center min-h-[52px] sm:min-h-[60px] lg:min-h-[64px] px-6 sm:px-10 lg:px-14 rounded-full bg-gradient-to-r from-[#ee1314] to-[#B71C1C] text-white font-client-display font-extrabold text-[15px] sm:text-[16px] lg:text-[18px] uppercase tracking-wider border-[2px] lg:border-[2.5px] border-white/90 shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] hover:from-[#B71C1C] hover:to-[#ee1314] active:scale-95 cursor-pointer"
            >
              {HERO_CONTENT.cta}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
