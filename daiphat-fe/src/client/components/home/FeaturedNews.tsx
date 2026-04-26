import React from 'react';

const NEWS_DATA = [
  {
    id: 1,
    title: "Vietlott Power 6/55: Giải Jackpot ước tính 150 Tỷ đồng!",
    time: "3 ngày trước",
    image: "/assets/news/jackpot.png"
  },
  {
    id: 2,
    title: "Vietlott trao thưởng hơn 10 tỷ đồng cho khách hàng may mắn",
    time: "5 ngày trước",
    image: "/assets/news/winner.png"
  }
];

export const FeaturedNews: React.FC = () => {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 font-client-main">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[16px] font-semibold text-[#111111] uppercase font-client-main">
          TIN TỨC NỔI BẬT
        </h3>
        <button className="text-[13px] font-medium text-slate-400 hover:text-[#E60F14] flex items-center gap-0.5 cursor-pointer transition-colors font-client-main">
          Xem tất cả
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>

      <div className="space-y-6">
        {NEWS_DATA.map((item) => (
          <div key={item.id} className="group flex gap-4 cursor-pointer">
            <div className="relative w-24 h-16 shrink-0 rounded-xl overflow-hidden shadow-sm">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
            </div>
            <div className="flex flex-col justify-center gap-1">
              <h4 className="text-[13px] font-bold text-[#102937] line-clamp-2 leading-snug group-hover:text-[#E60F14] transition-colors">
                {item.title}
              </h4>
              <span className="text-[11px] font-medium text-slate-400">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
