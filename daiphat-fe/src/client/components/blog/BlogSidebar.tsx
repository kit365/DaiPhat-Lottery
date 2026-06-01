import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { id: 'all', name: 'Tất cả tin tức', icon: 'fa-solid fa-border-all', count: 128 },
  { id: 'result', name: 'Kết quả & Thống kê', icon: 'fa-solid fa-chart-simple', count: 45 },
  { id: 'exp', name: 'Kinh nghiệm chơi số', icon: 'fa-solid fa-lightbulb', count: 38 },
  { id: 'event', name: 'Sự kiện & Khuyến mãi', icon: 'fa-solid fa-calendar-check', count: 28 },
  { id: 'news', name: 'Tin tức Đại Phát', icon: 'fa-regular fa-newspaper', count: 17 },
  { id: 'tips', name: 'Bí quyết', icon: 'fa-solid fa-link', count: 32 }
];

export const BlogCategoryWidget = ({ activeCategoryName = 'Tất cả tin tức' }: { activeCategoryName?: string }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] mb-6">
      <h3 className="text-[17px] font-bold text-[#212B36] mb-4">Danh mục tin tức</h3>
      <ul className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = cat.name === activeCategoryName;
          return (
            <li key={cat.id}>
              <Link 
                to="/blogs" 
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors group ${
                  isActive ? 'bg-[#FFF4F4] text-[#BA0000]' : 'hover:bg-[#FAFBFC] text-[#454F5B]'
                }`}
              >
                <div className={`flex items-center gap-3 text-[14px] ${isActive ? 'font-semibold' : 'font-medium group-hover:text-[#212B36]'}`}>
                  <i className={`${cat.icon} w-4 text-center ${isActive ? '' : 'text-[#919EAB]'}`}></i> {cat.name}
                </div>
                <span className={`${isActive ? 'bg-white text-[#BA0000]' : 'bg-[#F4F6F8] text-[#637381]'} text-[11px] font-bold px-2 py-0.5 rounded`}>
                  {cat.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const BlogFeaturedWidget = () => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/blogs/detail');
    window.scrollTo(0, 0);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
      <h3 className="text-[17px] font-bold text-[#212B36] mb-5">Bài viết nổi bật</h3>
      <div className="flex flex-col gap-4">
        {/* Small Post 1 */}
        <div className="flex gap-3 group cursor-pointer" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-1.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#BA0000] transition-colors line-clamp-2">
              Kết quả xổ số hôm nay 08/05/2025 - Kiên Giang 2K2
            </h4>
            <div className="flex items-center justify-between text-[11px] text-[#919EAB]">
              <span>08/05/2025</span>
              <span className="flex items-center gap-1"><i className="fa-regular fa-eye"></i> 10.256</span>
            </div>
          </div>
        </div>
        {/* Small Post 2 */}
        <div className="flex gap-3 group cursor-pointer" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-2.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#BA0000] transition-colors line-clamp-2">
              Thống kê lô gan Kiên Giang 2K2 trong 30 ngày qua
            </h4>
            <div className="flex items-center justify-between text-[11px] text-[#919EAB]">
              <span>07/05/2025</span>
              <span className="flex items-center gap-1"><i className="fa-regular fa-eye"></i> 8.213</span>
            </div>
          </div>
        </div>
        {/* Small Post 3 */}
        <div className="flex gap-3 group cursor-pointer" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-3.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#BA0000] transition-colors line-clamp-2">
              Cách nuôi số đẹp hiệu quả từ cao thủ
            </h4>
            <div className="flex items-center justify-between text-[11px] text-[#919EAB]">
              <span>06/05/2025</span>
              <span className="flex items-center gap-1"><i className="fa-regular fa-eye"></i> 6.987</span>
            </div>
          </div>
        </div>
        {/* Small Post 4 */}
        <div className="flex gap-3 group cursor-pointer" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-4.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#BA0000] transition-colors line-clamp-2">
              Khuyến mãi nạp lần đầu tặng ngay 10%
            </h4>
            <div className="flex items-center justify-between text-[11px] text-[#919EAB]">
              <span>05/05/2025</span>
              <span className="flex items-center gap-1"><i className="fa-regular fa-eye"></i> 5.643</span>
            </div>
          </div>
        </div>
      </div>
      
      <button 
        className="w-full flex items-center justify-center gap-2 mt-6 py-3 bg-[#FFF4F4] text-[#BA0000] rounded-lg text-[14px] font-bold hover:bg-[#FFE5E5] transition-colors"
        onClick={() => {
          navigate('/blogs');
          window.scrollTo(0, 0);
        }}
      >
        Xem tất cả tin tức <i className="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  );
};
