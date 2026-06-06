import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, User as UserIcon, Home, Crosshair, Ticket, CalendarDays, Gift, Bell, Wallet, ChevronDown, ShoppingCart, BookOpen, Trash2 } from "lucide-react";
import { ROUTES } from "../../../admin/constants/routes";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useCartStore } from "../../../stores/useCartStore";
import { LoginModal } from "../../components/auth/LoginModal";
import { RegisterModal } from "../../components/auth/RegisterModal";
import { ProfileSetupModal } from "../../components/auth/ProfileSetupModal";
import { VerifyModal } from "../../components/auth/VerifyModal";
import { ForgotPasswordModal } from "../../components/auth/ForgotPasswordModal";
import { BottomNav } from "./BottomNav";
import { NotificationDropdown } from "./NotificationDropdown";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { Skeleton } from "../../../components/ui/Skeleton";
import { AppToast as toast } from "../../utils/toast.util";

const navItems = [
  { label: "Trang chủ", to: ROUTES.PUBLIC.HOME, icon: Home },
  { label: "Mua vé số", to: "/buy-ticket", icon: Ticket },
  { label: "Kết quả", to: "#", icon: Crosshair },
  { label: "Vé của tôi", to: "/profile/tickets", icon: Ticket },
  { label: "Lịch mở thưởng", to: "#", icon: CalendarDays },
  { label: "Bài viết", to: "/blogs", icon: BookOpen },
];

export const Header = () => {
  const { 
    user: realUser, 
    logout, 
    isUserLoading,
    token
  } = useAuth();
  
  const user = realUser;
  const { isProfileSetupModalOpen, openLoginModal, openProfileSetupModal } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const cartItems = useCartStore(state => state.items);
  const removeCartItem = useCartStore(state => state.removeItem);
  const { unreadCount } = useNotifications(4);

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
        className="relative w-full z-[1000] bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm lg:fixed lg:top-0 lg:left-0 lg:bg-white/80 transition-all duration-300"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-label="Client navigation"
      >
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-auto lg:h-20 flex flex-col lg:flex-row lg:items-center lg:justify-between py-4 lg:py-0 border-b border-black/5 lg:border-none gap-4 lg:gap-8">
          <div className="flex items-center justify-between w-full lg:w-auto shrink-0">
            <Link to={ROUTES.PUBLIC.HOME} className="flex items-center gap-2.5 no-underline transition-transform hover:scale-[1.02] font-client-display" aria-label="DaiPhat home">
              <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Đại Phát Logo" className="w-[42px] h-[42px] object-contain" />
              <div className="flex flex-col justify-center">
                  <span className="text-[20px] tracking-tight font-client-display font-black text-[#ee1314] leading-none mb-1">ĐẠI PHÁT</span>
                  <span className="text-[8.5px] font-bold text-[#F59E0B] leading-none uppercase tracking-wider whitespace-nowrap">Tài lộc - May mắn - Thịnh vượng</span>
              </div>
            </Link>

            {/* Tablet/Mobile Top Actions - Removed Avatar as it is in Bottom Nav */}
            <div className="lg:hidden flex items-center">
              {/* Keeping this div for potential future small actions like notifications, but empty for now as requested */}
            </div>
          </div>

          {/* Desktop Navigation (Hidden on Tablet/Mobile < 1024px) */}
          <div className="hidden lg:flex justify-center items-center gap-1 xl:gap-3 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.to === ROUTES.PUBLIC.HOME ? location.pathname === ROUTES.PUBLIC.HOME : location.pathname.startsWith(item.to) && item.to !== "#";
              
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-2 font-bold no-underline transition-colors px-4 py-2.5 rounded-2xl text-[15px] tracking-tight font-client-display ${
                    isActive
                      ? "bg-[#FFF4F4] text-[#ee1314]" 
                      : "text-[#505050] hover:text-[#ee1314] hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center justify-end gap-3 xl:gap-5 shrink-0">
            {token && isUserLoading ? (
              <div className="flex items-center gap-4 animate-in fade-in duration-500">
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton width={120} height={16} />
                  <Skeleton width={60} height={12} />
                </div>
                <Skeleton variant="circle" width={44} height={44} />
              </div>
            ) : user ? (
              <div className="flex items-center gap-6">
                {/* Balance removed as requested */}

                <div className="flex items-center gap-1">
                  <div className="relative group">
                    <button 
                      onClick={() => navigate('/cart')}
                      className="relative text-[#505050] hover:text-[#ee1314] transition-colors p-2 hover:bg-slate-50 rounded-full cursor-pointer"
                    >
                      <ShoppingCart size={22} strokeWidth={2} />
                      {cartItems.length > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-[#ee1314] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                          {cartItems.length}
                        </span>
                      )}
                    </button>
                    
                    {/* Cart Dropdown */}
                    <div className="absolute top-full right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-[#E5E8EB] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[1100]">
                      <div className="p-4 flex items-center justify-between border-b border-[#E5E8EB]">
                        <h4 className="font-bold text-[#212B36] text-[15px]">Giỏ hàng <span className="text-[#ee1314]">({cartItems.length})</span></h4>
                        <span className="text-[13px] text-[#637381] cursor-pointer hover:text-[#ee1314]" onClick={() => navigate('/cart')}>Xem giỏ hàng</span>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto p-2">
                        {(() => {
                          if (cartItems.length === 0) {
                            return <div className="p-6 text-center text-[#637381] text-[14px]">Chưa có sản phẩm nào.</div>;
                          }
                          return cartItems.map(item => (
                            <div key={item.id} className="relative flex gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors group/item border-b border-gray-100 last:border-0">
                              {/* Left: Icon */}
                              <div className="w-11 h-11 shrink-0 rounded-full border border-[#E5E8EB] shadow-sm p-1.5 flex items-center justify-center bg-white cursor-pointer" onClick={() => navigate('/cart')}>
                                <img src="https://i.ibb.co/XrKTHt8g/t-i-xu-ng.png" alt="Province" className="w-full h-full object-contain" />
                              </div>
                              
                              {/* Middle & Right: Content */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer" onClick={() => navigate('/cart')}>
                                <div className="flex items-start justify-between mb-1">
                                    <div>
                                        <div className="text-[13px] font-bold text-[#212B36] truncate">{item.province}</div>
                                        <div className="text-[11px] text-[#637381] mt-0.5">
                                            {item.time} • {item.date ? item.date.split(',')[0] : 'Hôm nay'}
                                        </div>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeCartItem(item.id); }} 
                                      className="text-gray-400 hover:text-[#ee1314] transition-colors p-1"
                                      title="Xóa vé"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <div className="text-[15px] font-black text-[#ee1314] tracking-wide">{item.numbers}</div>
                                    <div className="flex items-center gap-5">
                                        <div className="text-[13px] text-[#212B36]">x {item.quantity}</div>
                                        <div className="text-[13px] font-bold text-[#212B36] w-[60px] text-right">{(item.price).toLocaleString('vi-VN')} đ</div>
                                    </div>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                      {cartItems.length > 0 && (
                        <div className="p-4 border-t border-[#E5E8EB] flex flex-col gap-3">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-[14px] font-bold text-[#212B36]">Tổng tiền</span>
                              <span className="text-[16px] font-bold text-[#ee1314]">
                                  {cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0).toLocaleString('vi-VN')} đ
                              </span>
                          </div>
                          <button onClick={() => navigate('/cart')} className="w-full py-2.5 bg-[#ee1314] text-white text-[14px] font-bold rounded-lg hover:bg-[#cc0000] transition-colors flex items-center justify-center gap-2">
                            <ShoppingCart size={18} /> Xem giỏ hàng
                          </button>
                          <button onClick={() => navigate('/buy-ticket')} className="w-full py-2.5 bg-white text-[#212B36] border border-[#E5E8EB] text-[14px] font-bold rounded-lg hover:border-[#ee1314] hover:text-[#ee1314] transition-colors">
                            Tiếp tục mua
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative group">
                    <button 
                      onClick={() => navigate('/profile/notifications')}
                      className="relative text-[#505050] hover:text-[#ee1314] transition-colors p-2 hover:bg-slate-50 rounded-full cursor-pointer"
                    >
                      <Bell size={22} strokeWidth={2} />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-[#ee1314] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>
                    <NotificationDropdown />
                  </div>
                </div>

                {/* User */}
                <div className="flex items-center gap-3 cursor-pointer group relative py-2">
                  <Link to="/profile" onClick={handleProfileClick} className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full border-2 border-white group-hover:border-[#FFB020] bg-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                      {user.avatar || user.avatarUrl ? (
                        <img
                          src={user.avatar || user.avatarUrl}
                          alt={user.fullName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#ee1314]/5 text-[#ee1314]">
                          <UserIcon size={20} className="font-bold" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 font-bold text-[#102937] group-hover:text-[#FFB020] transition-colors text-[14px] whitespace-nowrap">
                    {user.fullName || user.username}
                    <ChevronDown size={16} className="text-slate-400 group-hover:text-[#FFB020] transition-colors" />
                  </div>

                  {/* Profile Dropdown */}
                  <div className="absolute top-full right-0 mt-1 w-[200px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#E5E8EB] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[1100] py-2">
                    {/* Triangle pointer */}
                    <div className="absolute -top-[6px] right-8 w-3 h-3 bg-white border-l border-t border-[#E5E8EB] rotate-45"></div>
                    
                    <div className="relative z-10 bg-white rounded-xl">
                        <Link to="/profile/overview" className="flex items-center gap-3 px-5 py-3 text-[14.5px] text-[#212B36] hover:bg-slate-50 transition-colors">
                        <i className="fa-solid fa-layer-group text-[16px] text-[#637381] w-5 text-center"></i>
                        <span>Tổng Quan</span>
                        </Link>
                        <Link to="/profile/info" className="flex items-center gap-3 px-5 py-3 text-[14.5px] text-[#212B36] hover:bg-slate-50 transition-colors">
                        <i className="fa-regular fa-user text-[16px] text-[#637381] w-5 text-center"></i>
                        <span>Tài Khoản</span>
                        </Link>
                        <Link to="/profile/tickets" className="flex items-center gap-3 px-5 py-3 text-[14.5px] text-[#212B36] hover:bg-slate-50 transition-colors">
                        <i className="fa-solid fa-bag-shopping text-[16px] text-[#637381] w-5 text-center"></i>
                        <span>Đơn Hàng</span>
                        </Link>
                        <button onClick={() => logout()} className="w-full flex items-center gap-3 px-5 py-3 text-[14.5px] text-[#212B36] hover:bg-slate-50 transition-colors cursor-pointer text-left">
                        <i className="fa-solid fa-arrow-right-from-bracket text-[16px] text-[#637381] w-5 text-center"></i>
                        <span>Đăng Xuất</span>
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center min-h-[44px] px-8 rounded-xl bg-[#ee1314] text-white font-bold no-underline shadow-lg shadow-[#ee1314]/26 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer text-[15px] font-client-display uppercase tracking-tight"
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
          <div className="relative flex items-center h-12 px-4 bg-[#F4F6F8] border border-black/5 rounded-2xl focus-within:bg-white focus-within:border-[#ee1314] focus-within:shadow-md transition-all duration-300">
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
                          <span className="text-[16px] font-bold text-[#102937] leading-tight">{user.fullName || user.username}</span>
                          <span className="text-[13px] font-medium text-slate-500">Khách hàng thành viên</span>
                        </div>
                      </div>
                      <button
                        className="h-13 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl font-bold text-[#ee1314] transition-all active:scale-95 cursor-pointer font-client-display"
                        onClick={() => {
                          setIsMenuOpen(false);
                          logout();
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
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate('/login');
                        }}
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
      {/* <LoginModal />
      <RegisterModal /> */}
      <ProfileSetupModal />
      <VerifyModal />
      <ForgotPasswordModal />
    </>
  );
};
