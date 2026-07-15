import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Phone, Mail, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="relative bg-gradient-to-b from-white to-[#FFF8F8] pt-16 pb-8 overflow-hidden border-t border-red-100">
      {/* Background decoration watermark */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.4] md:opacity-[0.6] transition-opacity duration-300"
        style={{
          backgroundImage: "url('https://cdn.phototourl.com/free/2026-06-07-98422aba-75e7-49a6-ab69-6ed30ab67386.png')",
          backgroundSize: '100% auto',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="container mx-auto px-4 md:px-8 relative z-10 max-w-[1440px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 xl:gap-12 mb-12">

          {/* Column 1: About Company */}
          <div className="lg:col-span-2 flex flex-col space-y-5 pr-4">
            <div className="flex items-center gap-3">
              <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Đại Phát Logo" className="w-11 h-11 object-contain rounded-xl shadow-sm" />
              <div>
                <h2 className="text-[#ee1314] font-black text-xl leading-none mb-1 tracking-tight">ĐẠI PHÁT</h2>
                <span className="text-[#F5A623] text-[9px] font-bold tracking-wider uppercase whitespace-nowrap">TÀI LỘC - MAY MẮN - THỊNH VƯỢNG</span>
              </div>
            </div>

            <p className="text-slate-600 text-[13.5px] leading-relaxed">
              Đại Phát - Hệ thống xổ số kiến thiết uy tín hàng đầu Việt Nam. Nhanh chóng, minh bạch, bảo mật và luôn đồng hành cùng bạn trên hành trình may mắn.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-1">
              {['facebook', 'telegram', 'phone'].map((icon) => (
                <a key={icon} href="#" className="w-8 h-8 rounded-lg bg-red-50 hover:bg-[#ee1314] text-[#ee1314] hover:text-white flex items-center justify-center transition-all duration-300 hover:-translate-y-1 shadow-sm">
                  <i className={`fa-brands fa-${icon === 'phone' ? 'viber' : icon} text-[15px]`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: About Us Links */}
          <div className="flex flex-col">
            <h3 className="text-[#212B36] font-bold text-[14px] mb-5 uppercase tracking-wider relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-[#ee1314] pb-2">
              Về chúng tôi
            </h3>
            <ul className="space-y-3">
              {['Giới thiệu', 'Tin tức', 'Tuyển dụng', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Liên hệ'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-[13px] text-slate-600 hover:text-[#ee1314] hover:translate-x-1 transition-all duration-200 flex items-center justify-between group">
                    <span>{item}</span>
                    <ChevronRight size={12} className="text-slate-400 group-hover:text-[#ee1314] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Guide Links */}
          <div className="flex flex-col">
            <h3 className="text-[#212B36] font-bold text-[14px] mb-5 uppercase tracking-wider relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-[#ee1314] pb-2">
              Hướng dẫn
            </h3>
            <ul className="space-y-3">
              {['Hướng dẫn chơi', 'Hướng dẫn mua vé', 'Hướng dẫn thanh toán', 'Hướng dẫn nhận thưởng', 'Câu hỏi thường gặp'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-[13px] text-slate-600 hover:text-[#ee1314] hover:translate-x-1 transition-all duration-200 flex items-center justify-between group">
                    <span>{item}</span>
                    <ChevronRight size={12} className="text-slate-400 group-hover:text-[#ee1314] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Utilities Links */}
          <div className="flex flex-col">
            <h3 className="text-[#212B36] font-bold text-[14px] mb-5 uppercase tracking-wider relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-[#ee1314] pb-2">
              Tiện ích
            </h3>
            <ul className="space-y-3">
              {['Kết quả xổ số', 'Thống kê - Phân tích', 'Soi cầu', 'Lịch mở thưởng', 'Trúng thưởng hôm qua'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-[13px] text-slate-600 hover:text-[#ee1314] hover:translate-x-1 transition-all duration-200 flex items-center justify-between group">
                    <span>{item}</span>
                    <ChevronRight size={12} className="text-slate-400 group-hover:text-[#ee1314] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Contact */}
          <div className="flex flex-col">
            <h3 className="text-[#212B36] font-bold text-[14px] mb-5 uppercase tracking-wider relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-[2px] after:bg-[#ee1314] pb-2">
              Liên hệ
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-red-50 text-[#ee1314]">
                  <Phone size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#212B36]">1900 1234</h4>
                  <p className="text-[11px] text-slate-500">(8:00 - 22:00 mỗi ngày)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-red-50 text-[#ee1314]">
                  <Mail size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#212B36]">hotro@daiphat.com</h4>
                  <p className="text-[11px] text-slate-500">Hỗ trợ khách hàng</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-red-50 text-[#ee1314]">
                  <MapPin size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#212B36]">Tầng 5, 123 Lý Chính Thắng,</h4>
                  <p className="text-[11px] text-slate-500">P. Võ Thị Sáu, Q.3, TP.HCM<br />Trụ sở chính</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-slate-200/80 py-6 mt-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[12px]">
            <p>© {new Date().getFullYear()} Đại Phát Lottery. Tất cả quyền được bảo lưu.</p>
            <div className="flex items-center gap-6">
              <Link to="#" className="hover:text-[#ee1314] transition-colors">Điều khoản</Link>
              <Link to="#" className="hover:text-[#ee1314] transition-colors">Bảo mật</Link>
              <Link to="#" className="hover:text-[#ee1314] transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
