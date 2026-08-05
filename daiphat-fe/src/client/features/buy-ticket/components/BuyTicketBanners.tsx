import React from 'react';
import Image from 'next/image';
import imageLoader from '@/utils/imageLoader';
import { Link } from 'react-router-dom';

export const BuyTicketBanners = React.memo(() => (
  <div className="hidden xl:flex w-[260px] shrink-0 flex-col gap-4">
    {/* Banner 1 */}
    <Link to="/buy-ticket" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group h-[320px]">
      <Image 
        unoptimized
        src="https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png" 
        alt="Vé số Đại Phát" 
        fill
        sizes="260px"
        className="object-cover z-0" 
      />
      <div className="absolute inset-0 z-10 flex flex-col items-center pt-8 px-4 text-center">
        <h3 className="text-[#FFDF70] font-black text-[36px] leading-[1.1] mb-2 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>VÉ SỐ<br />ĐẠI PHÁT</h3>
        <p className="text-white text-[14px] font-medium mb-3 drop-shadow-md">Nền tảng mua vé số<br />uy tín hàng đầu</p>
        <span className="bg-gradient-to-r from-[#FFE58F] to-[#FFD666] text-[#D82A2A] font-bold px-5 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
          Mua vé ngay
        </span>
      </div>
    </Link>

    {/* Banner 2 */}
    <Link to="/gieo-que" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group h-[220px]">
      <Image 
        unoptimized
        src="https://i.ibb.co/LXLSg1qx/07bf0bdd-3932-4bbd-8df4-c08e72c52800.png" 
        alt="Tìm số may mắn" 
        fill
        sizes="260px"
        className="object-cover z-0" 
      />
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-start p-4 pb-10 w-[65%]">
        <h3 className="text-[#FFDF70] font-bold text-[14px] mb-2 drop-shadow-md">TÌM SỐ MAY MẮN</h3>
        <p className="text-white text-[14px] font-medium mb-3 drop-shadow-md leading-snug">Chọn dãy số yêu thích<br />nhận ngay lộc lớn!</p>
        <span className="bg-gradient-to-r from-[#FFE58F] to-[#FFD666] text-[#D82A2A] font-bold px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
          Gieo quẻ ngay
        </span>
      </div>
    </Link>

    {/* Banner 3 */}
    <a href="#" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group h-[220px]">
      <Image 
        unoptimized
        src="https://i.ibb.co/tpJtrscQ/d0ea187b-cfe0-4a28-9366-c10db2e6a96c.png" 
        alt="Dịch vụ vé số" 
        fill
        sizes="260px"
        className="object-cover z-0" 
      />
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-start p-4 w-[70%]">
        <h3 className="text-white font-bold text-[14px] mb-1.5 drop-shadow-md">DỊCH VỤ VÉ SỐ</h3>
        <div className="text-white font-bold text-[14px] mb-0.5">Nhận ảnh vé thật <span className="text-[14px]">100%</span></div>
        <p className="text-white text-[12px] mb-3 opacity-90">Bảo mật & An toàn tuyệt đối</p>
        <button className="bg-white text-[#ee1314] font-bold px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
          Tìm hiểu thêm
        </button>
      </div>
    </a>
  </div>
));

BuyTicketBanners.displayName = 'BuyTicketBanners';
