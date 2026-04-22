import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Ticket, Trophy, User } from "lucide-react";
import { ROUTES } from "../../../admin/constants/routes";
import { useAuth } from "../../../admin/pages/authen/hooks/useAuth";
import { useAuthStore } from "../../../stores/useAuthStore";
import { toast } from "react-toastify";

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, openProfileSetupModal } = useAuth();
  const { openLoginModal } = useAuthStore();

  const navItems = [
    {
      label: "Trang chủ",
      icon: Home,
      to: ROUTES.PUBLIC.HOME,
      action: null
    },
    {
      label: "Vé số",
      icon: Ticket,
      to: "#",
      action: null
    },
    {
      label: "Kết quả",
      icon: Trophy,
      to: "#",
      action: null
    },
    {
      label: "Tài khoản",
      icon: User,
      to: user ? "/profile" : "#",
      action: () => {
        if (!user) {
          openLoginModal();
        } else {
          const isSetupComplete = user.hasPassword && user.agreedToTerms;
          if (!isSetupComplete) {
            openProfileSetupModal();
            toast.info("Vui lòng hoàn tất thiết lập hồ sơ");
          } else {
            navigate("/profile");
          }
        }
      }
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden block">
      <div className="flex justify-around items-center h-[75px] bg-white/80 backdrop-blur-xl border-t border-black/5 px-4 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to && item.to !== "#";
          
          const Content = (
            <div className={`flex flex-col items-center justify-center gap-1.5 w-full h-full transition-colors duration-300 relative ${isActive ? "text-client-primary" : "text-client-muted"}`}>
              <item.icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-tab"
                  className="absolute -top-3 w-5 h-[3px] bg-client-primary rounded-b-[4px]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </div>
          );

          if (item.action) {
            return (
              <button
                key={item.label}
                className="flex-1 h-full cursor-pointer"
                onClick={item.action}
                type="button"
              >
                {Content}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex-1 h-full"
            >
              {Content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
