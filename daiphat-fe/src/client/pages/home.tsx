import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/layout/header";
import { PartnerLogos } from "../components/layout/PartnerLogos";
import { Hero } from "../components/home/Hero";
import { useAuthStore } from "../../stores/useAuthStore";

export const HomePage = () => {
  const { openVerifyModal } = useAuthStore();
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

      <main className="relative z-1">
        <Hero />

        <div className="max-w-[1240px] mx-auto px-6 py-10 lg:py-16">
          <PartnerLogos />
        </div>
      </main>
    </div>
  );
};
