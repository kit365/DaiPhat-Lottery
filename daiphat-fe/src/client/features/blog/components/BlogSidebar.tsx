import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicCategories, usePublicPosts } from '../hooks/useBlog';

const formatViews = (views: number) => {
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K lượt xem`;
  }
  return `${views} lượt xem`;
};

export const BlogCategoryWidget = ({ 
  activeCategoryName = 'Tất cả bài viết', 
  activeCategoryId, 
  hideCount = false 
}: { 
  activeCategoryName?: string, 
  activeCategoryId?: string | number, 
  hideCount?: boolean 
}) => {
  const { data: categories = [], isLoading } = usePublicCategories();

  // Tạo thêm mục virtual "Tất cả bài viết" ở đầu
  const totalCount = categories.reduce((sum, cat) => sum + (cat.postCount || 0), 0);
  const items = [
    { id: 'all', name: 'Tất cả bài viết', slug: 'all', icon: 'fa-regular fa-newspaper', count: totalCount },
    ...categories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      slug: cat.slug,
      icon: cat.avatar || 'fa-regular fa-newspaper', // sử dụng trường avatar lưu font awesome class
      count: cat.postCount
    }))
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] mb-6">
      <h3 className="text-[17px] font-bold text-[#212B36] mb-4">Danh mục bài viết</h3>
      {isLoading ? (
        <div className="py-4 text-center text-[14px] text-[#919EAB]">Đang tải danh mục...</div>
      ) : (
        <ul className="flex flex-col">
          {items.map((cat, index) => {
            const isActive = cat.name === activeCategoryName || 
                             activeCategoryId === cat.id || 
                             (cat.slug === 'all' && (!activeCategoryId || activeCategoryId === 'all') && (activeCategoryName === 'Tất cả bài viết'));
            const isLast = index === items.length - 1;
            return (
              <li key={cat.id} className={isLast ? '' : 'border-b border-[#F4F6F8]'}>
                <Link
                  to={cat.slug === 'all' ? '/blogs' : `/blogs?category=${cat.slug}`}
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
      )}
    </div>
  );
};

export const BlogFeaturedWidget = () => {
  const navigate = useNavigate();
  const { data: featuredData, isLoading } = usePublicPosts({
    page: 1,
    limit: 6,
    sortBy: 'viewCount',
    direction: 'desc'
  });

  const featuredPosts = featuredData?.recordList || [];

  return (
    <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
      <h3 className="text-[17px] font-bold text-[#212B36] mb-5">Bài viết nổi bật</h3>
      <div className="flex flex-col">
        {isLoading ? (
          <div className="py-4 text-center text-[13px] text-[#919EAB]">Đang tải...</div>
        ) : featuredPosts.length === 0 ? (
          <div className="py-4 text-center text-[13px] text-[#919EAB]">Không có bài viết nổi bật.</div>
        ) : (
          featuredPosts.map((post, index) => {
            const isLast = index === featuredPosts.length - 1;
            return (
              <div 
                key={post.id} 
                className={`flex gap-3 group cursor-pointer ${isLast ? '' : 'border-b border-[#F4F6F8] pb-3 mb-3'}`} 
                onClick={() => {
                  if (!post.slug) {
                    return;
                  }
                  navigate(`/blogs/detail/${post.slug}`);
                }}
              >
                <img 
                  src={post.thumbnail || '/assets/img/blog/blog-post-1.jpg'} 
                  alt={post.title} 
                  className="w-[84px] h-[64px] rounded-lg object-cover shrink-0" 
                  style={{ objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/img/blog/blog-post-1.jpg';
                  }}
                />
                <div className="flex flex-col justify-center">
                  <h4 className="text-[13px] font-semibold text-[#212B36] leading-[1.4] mb-1.5 group-hover:text-[#ee1314] transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <div className="flex items-center text-[11px] text-[#919EAB]">
                    <span>{formatViews(post.viewCount)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
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

export const RightSidebarBlog = ({ 
  activeCategoryName = 'Tất cả bài viết', 
  activeCategoryId, 
  hideCategoryCount = false 
}: { 
  activeCategoryName?: string, 
  activeCategoryId?: string | number, 
  hideCategoryCount?: boolean 
}) => {
  return (
    <div className="w-full lg:w-[340px] shrink-0">
      <BlogCategoryWidget 
        activeCategoryName={activeCategoryName} 
        activeCategoryId={activeCategoryId} 
        hideCount={hideCategoryCount} 
      />
      <BlogFeaturedWidget />
      <BuyTicketBanner />
    </div>
  );
};
