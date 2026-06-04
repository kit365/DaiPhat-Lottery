import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { id: 'all', name: 'Tất cả bài viết', icon: 'fa-regular fa-newspaper', count: 120 },
  { id: 'result', name: 'Kết quả xổ số', icon: 'fa-solid fa-chart-simple', count: 32 },
  { id: 'exp', name: 'Kinh nghiệm chơi số', icon: 'fa-solid fa-lightbulb', count: 28 },
  { id: 'soicau', name: 'Soi cầu', icon: 'fa-solid fa-magnifying-glass-chart', count: 25 },
  { id: 'news', name: 'Tin tức', icon: 'fa-regular fa-newspaper', count: 20 },
  { id: 'promo', name: 'Khuyến mãi', icon: 'fa-solid fa-gift', count: 15 },
  { id: 'featured', name: 'Bài viết nổi bật', icon: 'fa-solid fa-star', count: 12 }
];

export const BlogCategoryWidget = ({ activeCategoryName = 'Tất cả bài viết', hideCount = false }: { activeCategoryName?: string, hideCount?: boolean }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] mb-6">
      <h3 className="text-[17px] font-bold text-[#212B36] mb-4">Danh mục bài viết</h3>
      <ul className="flex flex-col">
        {CATEGORIES.map((cat, index) => {
          const isActive = cat.name === activeCategoryName;
          const isLast = index === CATEGORIES.length - 1;
          return (
            <li key={cat.id} className={isLast ? '' : 'border-b border-[#F4F6F8]'}>
              <Link
                to="/blogs"
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-[#FFF4F4] text-[#ee1314]' : 'hover:bg-[#FAFBFC] text-[#454F5B]'
                  }`}
              >
                <div className={`flex items-center gap-3 text-[14px] ${isActive ? 'font-semibold' : 'font-medium group-hover:text-[#212B36]'}`}>
                  <i className={`${cat.icon} w-4 text-center ${isActive ? '' : 'text-[#919EAB]'}`}></i> {cat.name}
                </div>
                {!hideCount && (
                  <span className={`${isActive ? 'text-[#ee1314]' : 'text-[#637381]'} text-[13px]`}>
                    {cat.count}
                  </span>
                )}
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
    navigate('/blogs/detail/1');
    window.scrollTo(0, 0);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
      <h3 className="text-[17px] font-bold text-[#212B36] mb-5">Bài viết nổi bật</h3>
      <div className="flex flex-col">
        {/* Small Post 1 */}
        <div className="flex gap-3 group cursor-pointer border-b border-[#F4F6F8] pb-3 mb-3" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-1.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#ee1314] transition-colors line-clamp-2">
              Kết quả xổ số hôm nay 09/02/2025 – Cập nhật...
            </h4>
            <div className="flex items-center text-[11px] text-[#919EAB]">
              <span>12.5K lượt xem</span>
            </div>
          </div>
        </div>
        {/* Small Post 2 */}
        <div className="flex gap-3 group cursor-pointer border-b border-[#F4F6F8] pb-3 mb-3" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-2.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#ee1314] transition-colors line-clamp-2">
              Thần tài gõ cửa: Những con số may mắn hôm nay...
            </h4>
            <div className="flex items-center text-[11px] text-[#919EAB]">
              <span>8.7K lượt xem</span>
            </div>
          </div>
        </div>
        {/* Small Post 3 */}
        <div className="flex gap-3 group cursor-pointer border-b border-[#F4F6F8] pb-3 mb-3" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-3.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#ee1314] transition-colors line-clamp-2">
              Cách chọn số theo ngày sinh mang lại may mắn và tài lộc
            </h4>
            <div className="flex items-center text-[11px] text-[#919EAB]">
              <span>15.3K lượt xem</span>
            </div>
          </div>
        </div>
        {/* Small Post 4 */}
        <div className="flex gap-3 group cursor-pointer border-b border-[#F4F6F8] pb-3 mb-3" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-4.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#ee1314] transition-colors line-clamp-2">
              Soi cầu xổ số miền Nam 09/02/2025 – Dự đoán...
            </h4>
            <div className="flex items-center text-[11px] text-[#919EAB]">
              <span>9.1K lượt xem</span>
            </div>
          </div>
        </div>
        {/* Small Post 5 */}
        <div className="flex gap-3 group cursor-pointer border-b border-[#F4F6F8] pb-3 mb-3" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-1.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#ee1314] transition-colors line-clamp-2">
              Mua vé số Online – Tiện lợi, nhanh chóng, bảo mật 100%
            </h4>
            <div className="flex items-center text-[11px] text-[#919EAB]">
              <span>6.2K lượt xem</span>
            </div>
          </div>
        </div>
        {/* Small Post 6 */}
        <div className="flex gap-3 group cursor-pointer" onClick={handleNavigate}>
          <img src="/assets/img/blog/blog-post-1.jpg" alt="post" className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" />
          <div className="flex flex-col justify-center">
            <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#ee1314] transition-colors line-clamp-2">
              Kết quả xổ số hôm nay 09/02/2025 – Cập nhật...
            </h4>
            <div className="flex items-center text-[11px] text-[#919EAB]">
              <span>12.5K lượt xem</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BuyTicketBanner = () => (
  <Link
    to="/buy-ticket"
    className="block mt-6 rounded-xl overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.03)] group relative aspect-[1448/1086]"
  >
    <div
      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
      style={{ backgroundImage: 'url("https://i.ibb.co/q3rWD00G/75b31416-13ed-49ce-8708-b4861fc96198.png")' }}
    ></div>

    <div className="relative z-10 p-6 flex flex-col h-full w-[85%]">
      <h3 className="text-[16px] font-black text-[#452B22] leading-[1.1] uppercase mb-0.5 whitespace-nowrap">
        MUA VÉ SỐ<br />
        <span className="text-[#ee1314] text-[26px]">ONLINE</span>
      </h3>
      <p className="text-[9px] font-bold text-[#452B22] mb-3 opacity-90 whitespace-nowrap">
        Nhanh chóng <span className="text-[#ee1314]">•</span> An toàn <span className="text-[#ee1314]">•</span> Minh bạch
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-[#FFF0E6]">
            <i className="fa-solid fa-hand-pointer text-[#ee1314] text-[9px]"></i>
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-bold text-[#212B36] leading-tight mb-0.5 whitespace-nowrap">Chọn số dễ dàng</h4>
            <p className="text-[8px] text-[#454F5B] leading-tight whitespace-nowrap">Tìm và chọn số yêu thích nhanh chóng</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-[#FFF0E6]">
            <i className="fa-regular fa-clock text-[#ee1314] text-[9px]"></i>
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-bold text-[#212B36] leading-tight mb-0.5 whitespace-nowrap">Theo dõi kết quả tự động</h4>
            <p className="text-[8px] text-[#454F5B] leading-tight whitespace-nowrap">Cập nhật kết quả nhanh chóng, chính xác</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-[#FFF0E6]">
            <i className="fa-solid fa-shield-halved text-[#ee1314] text-[9px]"></i>
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-bold text-[#212B36] leading-tight mb-0.5 whitespace-nowrap">Quản lý vé mọi lúc</h4>
            <p className="text-[8px] text-[#454F5B] leading-tight whitespace-nowrap">Lưu trữ và quản lý vé tiện lợi, an toàn</p>
          </div>
        </div>
      </div>

      <button className="mt-3 bg-[#ee1314] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold group-hover:bg-[#cc0000] transition-colors flex items-center gap-1.5 shadow-md shadow-[#ee1314]/30 w-fit">
        <i className="fa-solid fa-ticket"></i> Mua vé ngay <i className="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  </Link>
);

export const RightSidebarBlog = ({ activeCategoryName = 'Tất cả bài viết', hideCategoryCount = false }: { activeCategoryName?: string, hideCategoryCount?: boolean }) => {
  return (
    <div className="w-full lg:w-[340px] shrink-0">
      <BlogCategoryWidget activeCategoryName={activeCategoryName} hideCount={hideCategoryCount} />
      <BlogFeaturedWidget />
      <BuyTicketBanner />
    </div>
  );
};
