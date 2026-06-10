import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Phone, Mail, MapPin, ShieldCheck, Lock, HeadphonesIcon } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="relative bg-[#Fdfdfd] pt-16 overflow-hidden border-t border-red-50">
      {/* Background image from user */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-100"
        style={{
          backgroundImage: "url('https://cdn.phototourl.com/free/2026-06-07-98422aba-75e7-49a6-ab69-6ed30ab67386.png')",
          backgroundSize: '100% auto',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="container mx-auto px-4 relative z-10 max-w-[1440px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 xl:gap-12 mb-16">

          {/* Column 1: About Company */}
          <div className="lg:col-span-2 flex flex-col space-y-6 pr-4">
            <div className="flex items-center gap-2">
              <img src="https://i.ibb.co/4R7c75YN/z7824247008533-94446d3b6c16598cda67404d805c15c4.jpg" alt="Đại Phát Logo" className="w-12 h-12 object-contain" />
              <div>
                <h2 className="text-[#ee1314] font-black text-xl leading-none mb-1">ĐẠI PHÁT</h2>
                <span className="text-[#F5A623] text-[10px] font-bold tracking-widest uppercase whitespace-nowrap">TÀI LỘC - MAY MẮN - THỊNH VƯỢNG</span>
              </div>
            </div>

            <p className="text-slate-600 text-[13px] leading-relaxed">
              Đại Phát - Hệ thống xổ số kiến thiết uy tín hàng đầu Việt Nam. Nhanh chóng, minh bạch, bảo mật và luôn đồng hành cùng bạn trên hành trình may mắn.
            </p>

          </div>

          {/* Column 2: About Us Links */}
          <div className="flex flex-col">
            <h3 className="text-[#ee1314] font-bold text-[15px] mb-6 uppercase tracking-wide border-b-2 border-[#ee1314] pb-2 inline-block w-max">
              Về chúng tôi
            </h3>
            <ul className="space-y-3.5">
              {['Giới thiệu', 'Tin tức', 'Tuyển dụng', 'Điều khoản sử dụng', 'Chính sách bảo mật', 'Liên hệ'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-[14px] text-slate-600 hover:text-[#ee1314] transition-colors flex items-center justify-between group">
                    <span>{item}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-[#ee1314] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Guide Links */}
          <div className="flex flex-col">
            <h3 className="text-[#ee1314] font-bold text-[15px] mb-6 uppercase tracking-wide border-b-2 border-[#ee1314] pb-2 inline-block w-max">
              Hướng dẫn
            </h3>
            <ul className="space-y-3.5">
              {['Hướng dẫn chơi', 'Hướng dẫn mua vé', 'Hướng dẫn thanh toán', 'Hướng dẫn nhận thưởng', 'Câu hỏi thường gặp'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-[14px] text-slate-600 hover:text-[#ee1314] transition-colors flex items-center justify-between group">
                    <span>{item}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-[#ee1314] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Utilities Links */}
          <div className="flex flex-col">
            <h3 className="text-[#ee1314] font-bold text-[15px] mb-6 uppercase tracking-wide border-b-2 border-[#ee1314] pb-2 inline-block w-max">
              Tiện ích
            </h3>
            <ul className="space-y-3.5">
              {['Kết quả xổ số', 'Thống kê - Phân tích', 'Soi cầu', 'Lịch mở thưởng', 'Trúng thưởng hôm qua'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-[14px] text-slate-600 hover:text-[#ee1314] transition-colors flex items-center justify-between group">
                    <span>{item}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-[#ee1314] transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Contact */}
          <div className="flex flex-col">
            <h3 className="text-[#ee1314] font-bold text-[15px] mb-6 uppercase tracking-wide border-b-2 border-[#ee1314] pb-2 inline-block w-max">
              Liên hệ
            </h3>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <div className="mt-1 text-[#ee1314]">
                  <Phone size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#102937]">1900 1234</h4>
                  <p className="text-[12px] text-slate-500">(8:00 - 22:00 mỗi ngày)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-[#ee1314]">
                  <Mail size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#102937]">hotro@daiphat.com</h4>
                  <p className="text-[12px] text-slate-500">Hỗ trợ khách hàng</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 text-[#ee1314]">
                  <MapPin size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#102937]">Tầng 5, 123 Lý Chính Thắng,</h4>
                  <p className="text-[12px] text-slate-500">P. Võ Thị Sáu, Q.3, TP.HCM<br />Trụ sở chính</p>
                </div>
              </li>
            </ul>

          </div>
        </div>
      </div>


    </footer>
  );
};
