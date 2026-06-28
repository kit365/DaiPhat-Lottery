import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "../../../admin/constants/routes";
import { useAuthStore } from "../../../stores/useAuthStore";
import { AppToast as toast } from "../../utils/toast.util";

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, openLoginModal, openProfileSetupModal } = useAuthStore();

  const navItems = [
    {
      label: "Mua vé",
      icon: "fa-ticket",
      to: "/buy-ticket",
      action: null
    },
    {
      label: "Vé của tôi",
      icon: "fa-receipt",
      to: "/profile/tickets",
      action: null,
      hidden: !token
    },
    {
      label: "Trang chủ",
      icon: "fa-house",
      to: ROUTES.PUBLIC.HOME,
      action: null
    },
    {
      label: "Bài viết",
      icon: "fa-book-open",
      to: "/blogs",
      action: null
    },
    {
      label: "Tài khoản",
      icon: "fa-user",
      to: "/profile",
      action: (e: React.MouseEvent) => {
        if (!token) {
          e.preventDefault();
          navigate('/login');
        } else if (user) {
          const shouldRequireProfileSetup = !user.agreedToTerms;
          if (shouldRequireProfileSetup) {
            e.preventDefault();
            openProfileSetupModal();
            toast.info("Vui lòng hoàn tất thiết lập hồ sơ");
          }
        }
      }
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden block">
      <div className="flex justify-around items-center h-[75px] bg-white/80 backdrop-blur-xl border-t border-black/5 px-4 pb-[env(safe-area-inset-bottom)]">
        {navItems.filter(item => !item.hidden).map((item) => {
          const isActive = location.pathname === item.to && item.to !== "#";
          
          const Content = (
            <div className={`flex flex-col items-center justify-center gap-1.5 w-full h-full transition-colors duration-300 relative ${isActive ? "text-[#ee1314]" : "text-[#637381]"}`}>
              <i className={`fa-solid ${item.icon} text-[20px] ${isActive ? "text-[#ee1314]" : "text-[#637381]"}`}></i>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#ee1314]" : "text-[#637381]"}`}>{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-tab"
                  className="absolute top-0 w-8 h-[3px] bg-[#ee1314] rounded-b-[4px]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </div>
          );

          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex-1 h-full cursor-pointer block"
              onClick={item.action ? (e) => item.action(e) : undefined}
            >
              {Content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
