"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, User as UserIcon, Home, Crosshair, Ticket, CalendarDays, Gift, Bell, Wallet, ChevronDown, ShoppingCart, BookOpen, Trash2, Sparkles } from "lucide-react";
import { ROUTES } from "../../../admin/constants/routes";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useCartStore } from "../../../stores/useCartStore";
import { BottomNav } from "./BottomNav";
import { NotificationDropdown } from "./NotificationDropdown";
import {
  HEADER_DROPDOWN_ACTION_CLASS,
  HEADER_DROPDOWN_ITEM_TITLE_CLASS,
  HEADER_DROPDOWN_TITLE_CLASS,
} from "./headerDropdown.constants";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { Skeleton } from "../../../components/ui/Skeleton";
import { AppToast as toast } from "../../../utils/toast.util";

const navItems = [
  { label: "Trang chủ", to: ROUTES.PUBLIC.HOME, icon: Home },
  { label: "Mua vé số", to: "/buy-ticket", icon: Ticket },
  { label: "Vé của tôi", to: "/profile/tickets", icon: Ticket },
  { label: "Gieo quẻ", to: ROUTES.PUBLIC.FORTUNE, icon: Sparkles },
  { label: "Lịch mở thưởng", to: "/lich-mo-thuong", icon: CalendarDays },
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const cartItems = useCartStore(state => state.items);
  const removeCartItem = useCartStore(state => state.removeItem);
  const { unreadCount } = useNotifications(4);

  // Monitor window scroll to make header sticky & compact
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleAuthClick = (callback: () => void) => {
    setIsMenuOpen(false);
    callback();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) return;

    const shouldRequireProfileSetup = !user.agreedToTerms;
    if (shouldRequireProfileSetup) {
      e.preventDefault();
      openProfileSetupModal();
      toast.info("Vui lòng hoàn tất thiết lập hồ sơ để tiếp tục");
    }
  };

  return (
    <>
      <motion.nav
        className={`w-full z-[1000] fixed top-0 left-0 right-0 transition-all duration-300 ${
          scrolled 
            ? "bg-white/85 backdrop-blur-xl border-b border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)]" 
            : "bg-white/95 lg:bg-white/70 lg:backdrop-blur-md border-b border-transparent"
        }`}
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-label="Client navigation"
      >
        <div className={`max-w-[1440px] mx-auto px-4 lg:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between py-4 lg:py-0 transition-all duration-300 gap-4 lg:gap-8 ${
          scrolled ? "h-auto lg:h-[68px]" : "h-auto lg:h-20"
        }`}>
          <div className="flex items-center justify-between w-full lg:w-auto shrink-0 group">
            <Link to={ROUTES.PUBLIC.HOME} className="flex items-center gap-3 no-underline font-client-display" aria-label="DaiPhat home">
              <div className="relative p-[2px] bg-gradient-to-tr from-[#ee1314] to-[#F59E0B] rounded-xl shadow-md shadow-[#ee1314]/10 transition-transform duration-300 group-hover:scale-105">
                <Image 
                  src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" 
                  alt="Đại Phát Logo"
                  width={38}
                  height={38}
                  priority
                  className="w-[38px] h-[38px] rounded-[10px] object-cover bg-white" 
                />
              </div>
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
          <div className="hidden lg:flex justify-center items-center gap-0.5 xl:gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {navItems.filter(item => item.to !== "/profile/tickets" || token).map((item) => {
              const Icon = item.icon;
              const isActive = item.to === ROUTES.PUBLIC.HOME ? location.pathname === ROUTES.PUBLIC.HOME : location.pathname.startsWith(item.to) && item.to !== "#";
              
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`relative flex shrink-0 items-center gap-1.5 xl:gap-2 font-bold no-underline transition-all duration-300 px-2.5 xl:px-3.5 py-2 xl:py-2.5 rounded-2xl text-[12.5px] xl:text-[14px] tracking-tight font-client-display select-none whitespace-nowrap ${
                    isActive
                      ? "text-[#ee1314]" 
                      : "text-slate-600 hover:text-[#ee1314]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBg"
                      className="absolute inset-0 bg-[#FFF4F4] rounded-xl -z-10 border border-[#ee1314]/5 shadow-[0_2px_8px_rgba(238,19,20,0.04)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 shrink-0" />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
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

                <div className="flex items-center gap-1.5">
                  <div className="relative group">
                    <button 
                      onClick={() => navigate('/cart')}
                      className="relative text-[#505050] hover:text-[#ee1314] hover:bg-[#FFF4F4]/50 transition-all p-2 rounded-full cursor-pointer"
                    >
                      <ShoppingCart size={21} strokeWidth={2} />
                      {cartItems.length > 0 && (
                        <motion.span 
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#ee1314] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white"
                        >
                          {cartItems.length}
                        </motion.span>
                      )}
                    </button>
                    
                    {/* Cart Dropdown */}
                    <div className="absolute top-full right-0 mt-2 w-[370px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100 opacity-0 invisible pointer-events-none translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 transition-all duration-300 ease-out z-[1100] overflow-hidden">
                      <div className="p-4 flex items-center justify-between border-b border-[#E5E8EB]">
                        <h4 className={HEADER_DROPDOWN_TITLE_CLASS}>Giỏ hàng <span className="text-[#ee1314]">({cartItems.length})</span></h4>
                        <span className={`${HEADER_DROPDOWN_ACTION_CLASS} cursor-pointer hover:text-[#ee1314]`} onClick={() => navigate('/cart')}>Xem giỏ hàng</span>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto p-2">
                        {(() => {
                          if (cartItems.length === 0) {
                            return <div className="p-6 text-center text-[#637381] text-[13.5px]">Chưa có sản phẩm nào.</div>;
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
                                        <div className={`${HEADER_DROPDOWN_ITEM_TITLE_CLASS} truncate`}>{item.province}</div>
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
                        <div className="p-4 border-t border-[#E5E8EB] flex flex-col gap-2.5">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-[14px] font-bold text-[#212B36]">Tổng tiền</span>
                              <span className="text-[16px] font-bold text-[#ee1314]">
                                  {cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0).toLocaleString('vi-VN')} đ
                              </span>
                          </div>
                          <button onClick={() => navigate('/cart')} className="w-full py-2.5 bg-[#ee1314] text-white text-[14px] font-bold rounded-xl hover:bg-[#cc0000] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                            <ShoppingCart size={18} /> Xem giỏ hàng
                          </button>
                          <button onClick={() => navigate('/buy-ticket')} className="w-full py-2.5 bg-white text-[#212B36] border border-[#E5E8EB] text-[14px] font-bold rounded-xl hover:border-[#ee1314] hover:text-[#ee1314] transition-colors cursor-pointer">
                            Tiếp tục mua
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
 
                  <div className="relative group">
                    <button 
                      onClick={() => navigate('/profile/notifications')}
                      className="relative text-[#505050] hover:text-[#ee1314] hover:bg-[#FFF4F4]/50 transition-all p-2 rounded-full cursor-pointer"
                    >
                      <Bell size={21} strokeWidth={2} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#ee1314] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>
                    <NotificationDropdown />
                  </div>
                </div>

                {/* User */}
                <div ref={profileMenuRef} className="relative py-2 select-none">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3 cursor-pointer group"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="menu"
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full border-2 border-white group-hover:border-[#ee1314] bg-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                        {user.avatar || user.avatarUrl ? (
                          <img
                            src={user.avatar || user.avatarUrl}
                            alt={user.fullName || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#ee1314]/5 text-[#ee1314]">
                            <UserIcon size={19} className="font-bold" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-[#102937] group-hover:text-[#ee1314] transition-colors text-[14px] whitespace-nowrap">
                      {user.fullName || user.username}
                      <ChevronDown
                        size={15}
                        className={`text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? "rotate-180 text-[#ee1314]" : "group-hover:text-[#ee1314]"}`}
                      />
                    </div>
                  </button>

                  {/* Profile Dropdown */}
                  <div className={`absolute top-full right-0 mt-2 w-[210px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100 transition-all duration-200 ease-out z-[1100] py-2 overflow-hidden ${isProfileMenuOpen ? "opacity-100 visible pointer-events-auto translate-y-0" : "opacity-0 invisible pointer-events-none translate-y-2"}`}>
                    {/* Triangle pointer */}
                    <div className="absolute -top-[6px] right-8 w-3 h-3 bg-white border-l border-t border-slate-100 rotate-45 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <Link to="/profile/overview" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 text-[14px] font-medium text-[#212B36] hover:bg-slate-50 hover:text-[#ee1314] transition-colors">
                        <i className="fa-solid fa-layer-group text-[15px] text-[#637381] w-5 text-center"></i>
                        <span>Tổng Quan</span>
                        </Link>
                        <Link to="/profile/info" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 text-[14px] font-medium text-[#212B36] hover:bg-slate-50 hover:text-[#ee1314] transition-colors">
                        <i className="fa-regular fa-user text-[15px] text-[#637381] w-5 text-center"></i>
                        <span>Tài Khoản</span>
                        </Link>
                        <Link to="/profile/orders" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 text-[14px] font-medium text-[#212B36] hover:bg-slate-50 hover:text-[#ee1314] transition-colors">
                        <i className="fa-solid fa-bag-shopping text-[15px] text-[#637381] w-5 text-center"></i>
                        <span>Đơn Hàng</span>
                        </Link>
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                        <button onClick={() => { setIsProfileMenuOpen(false); logout(); }} className="w-full flex items-center gap-3 px-5 py-3 text-[14px] font-bold text-[#ee1314] hover:bg-[#FFF4F4]/50 transition-colors cursor-pointer text-left">
                        <i className="fa-solid fa-arrow-right-from-bracket text-[15px] text-[#ee1314] w-5 text-center"></i>
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
                  className="relative overflow-hidden inline-flex items-center justify-center min-h-[44px] px-8 rounded-xl bg-gradient-to-r from-[#ee1314] to-[#f93c3d] text-white font-bold no-underline shadow-md shadow-[#ee1314]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#ee1314]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer text-[14.5px] font-client-display uppercase tracking-wider"
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
    </>
  );
};
