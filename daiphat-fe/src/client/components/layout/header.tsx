import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Search, User as UserIcon } from "lucide-react";
import { ROUTES } from "../../../admin/constants/routes";
import { useAuthStore } from "../../../stores/useAuthStore";
import { LoginModal } from "../../components/auth/LoginModal";
import { RegisterModal } from "../../components/auth/RegisterModal";
import { ProfileSetupModal } from "../../components/auth/ProfileSetupModal";
import { VerifyModal } from "../../components/auth/VerifyModal";
import { ForgotPasswordModal } from "../../components/auth/ForgotPasswordModal";
import { BottomNav } from "./BottomNav";
import { useAuth } from "../../../admin/pages/authen/hooks/useAuth";
import { Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "react-toastify";

const navItems = [
  { label: "Trang chủ", to: ROUTES.PUBLIC.HOME },
  { label: "Vé số", to: "#" },
  { label: "Kết quả", to: "#" },
  { label: "Hướng dẫn", to: "#" },
];

export const Header = () => {
  const { 
    user, 
    logout, 
    openProfileSetupModal,
    isUserLoading,
    token
  } = useAuth();
  const { isProfileSetupModalOpen, openLoginModal } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Removed mandatory DP-32 Setup Enforcement auto-trigger

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleAuthClick = (callback: () => void) => {
    setIsMenuOpen(false);
    callback();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) return;
    
    const isSetupComplete = user.hasPassword && user.agreedToTerms;
    if (!isSetupComplete) {
      e.preventDefault();
      openProfileSetupModal();
      toast.info("Vui lòng hoàn tất thiết lập hồ sơ để tiếp tục");
    }
  };

  return (
    <>
      <motion.nav
        className="relative w-full z-[1000] bg-[#FDFBF7] lg:fixed lg:top-0 lg:left-0 lg:bg-[#FDFBF7]/95 lg:backdrop-blur-3xl lg:border-b lg:border-[#FFB800]/10 lg:shadow-sm transition-all duration-300"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-label="Client navigation"
      >
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 h-auto lg:h-20 grid grid-cols-1 lg:grid-cols-[1.2fr_auto_1fr] items-center py-4 lg:py-0 border-b border-black/5 lg:border-none">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <Link to={ROUTES.PUBLIC.HOME} className="flex items-center gap-2.5 no-underline text-[#102937] font-bold transition-transform hover:scale-[1.02] font-client-display" aria-label="DaiPhat home">
              <svg aria-hidden="true" viewBox="0 0 36 36" fill="none" width="34" height="34" className="text-[#E60F14]">
                <rect width="36" height="36" rx="8" fill="currentColor" />
                <path
                  d="M18 7.2 21.2 14h7l-5.6 4.6 1.8 7-6.4-3.8-6.4 3.8 1.8-7L7.8 14h7L18 7.2Z"
                  fill="#FFB800"
                  stroke="#FFB800"
                  strokeWidth=".6"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-lg lg:text-xl tracking-tighter font-client-display font-black text-[#102937]">Đại Phát</span>
            </Link>

            {/* Tablet/Mobile Top Actions - Removed Avatar as it is in Bottom Nav */}
            <div className="lg:hidden flex items-center">
              {/* Keeping this div for potential future small actions like notifications, but empty for now as requested */}
            </div>
          </div>

          {/* Desktop Navigation (Hidden on Tablet/Mobile < 1024px) */}
          <div className="hidden lg:flex justify-center items-center gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.label} 
                to={item.to}
                className="text-[#505050] font-bold no-underline transition-colors hover:text-[#E60F14] text-[15px] tracking-tight font-client-display"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center justify-end gap-5">
            {token && isUserLoading ? (
              <div className="flex items-center gap-4 animate-in fade-in duration-500">
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton width={120} height={16} />
                  <Skeleton width={60} height={12} />
                </div>
                <Skeleton variant="circle" width={44} height={44} />
              </div>
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-bold text-[#102937] leading-none">{user.firstName} {user.lastName}</span>
                  <button 
                    onClick={() => {
                      logout();
                      toast.success("Đăng xuất thành công!");
                    }} 
                    className="text-[12px] font-medium text-slate-400 hover:text-[#E60F14] transition-colors mt-0.5 cursor-pointer font-client-main"
                  >
                    Đăng xuất
                  </button>
                </div>
                <Link to="/profile" onClick={handleProfileClick} className="relative group">
                  <div className="w-11 h-11 rounded-full border-2 border-white bg-slate-100 shadow-sm overflow-hidden transition-transform group-hover:scale-105 group-hover:border-[#FF6262]/20">
                    {user.avatar || user.avatarUrl ? (
                      <img 
                        src={user.avatar || user.avatarUrl} 
                        alt={user.fullName || "User"} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#E60F14]/5 text-[#E60F14]">
                        <UserIcon size={20} className="font-bold" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                </Link>
              </div>
            ) : (
              <>
                <button 
                  onClick={openLoginModal} 
                  className="inline-flex items-center justify-center min-h-[44px] px-8 rounded-xl bg-[#E60F14] text-white font-bold no-underline shadow-lg shadow-[#E60F14]/26 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer text-[15px] font-client-display uppercase tracking-tight"
                  type="button"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>

        {/* Universal Search Row (Visible on Tablet/Mobile < 1024px) - STICKY logic */}
        <div className="lg:hidden sticky top-0 w-full px-5 py-3.5 bg-white/94 backdrop-blur-md z-[1100] shadow-sm">
          <div className="relative flex items-center h-12 px-4 bg-[#F4F6F8] border border-black/5 rounded-2xl focus-within:bg-white focus-within:border-[#E60F14] focus-within:shadow-md transition-all duration-300">
            <Search className="text-slate-400 mr-3 shrink-0" size={19} />
            <input 
              type="text" 
              placeholder="Tìm kiếm vé số, kết quả..." 
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#17191F] font-medium py-1"
            />
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              className="mobile-drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div 
              className="mobile-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="mobile-drawer-content">
                <div className="mobile-drawer-nav">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <Link 
                        to={item.to} 
                        className="mobile-nav-link"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="mobile-drawer-actions">
                  {user ? (
                    <div className="flex flex-col gap-4 w-full">
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-black/5">
                        <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200">
                          {user.avatar || user.avatarUrl ? (
                            <img src={user.avatar || user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <UserIcon size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[16px] font-bold text-[#102937] leading-tight">{user.firstName} {user.lastName}</span>
                          <span className="text-[13px] font-medium text-slate-500">Khách hàng thành viên</span>
                        </div>
                      </div>
                      <button
                        className="h-13 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl font-bold text-[#E60F14] transition-all active:scale-95 cursor-pointer font-client-display"
                        onClick={() => {
                          setIsMenuOpen(false);
                          logout();
                          toast.success("Đăng xuất thành công!");
                        }}
                      >
                        Đăng xuất tài khoản
                      </button>
                    </div>
                  ) : (
                    <>
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mobile-action-cta" // Using the CTA style for the single button
                        onClick={() => handleAuthClick(openLoginModal)}
                      >
                        Đăng nhập
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
      <LoginModal />
      <RegisterModal />
      <ProfileSetupModal />
      <VerifyModal />
      <ForgotPasswordModal />
    </>
  );
};
