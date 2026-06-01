import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/header';
import { BlogCategoryWidget, BlogFeaturedWidget } from '../components/blog/BlogSidebar';

export const BlogListPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif] pb-20">
      <Header />

      <main className="pt-28">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[14px] text-[#637381] mb-6">
            <Link to="/" className="hover:text-[#BA0000] transition-colors">Trang chủ</Link>
            <span className="text-[12px]">&gt;</span>
            <span className="text-[#212B36] font-medium">Tin tức</span>
          </div>

          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-[32px] font-bold text-[#212B36] m-0">Tin tức & Kinh nghiệm</h1>
            <div className="relative w-full md:w-[320px]">
              <input
                type="text"
                placeholder="Tìm kiếm tin tức..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E8EB] rounded-lg text-[14px] outline-none focus:border-[#BA0000] transition-colors"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#919EAB]"></i>
            </div>
          </div>

          {/* Categories Filter */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button className="flex items-center gap-2 px-3 py-2 bg-[#FFF4F4] border border-[#BA0000] text-[#BA0000] rounded-lg text-[14px] font-semibold transition-colors">
              <i className="fa-solid fa-border-all"></i> Tất cả
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#454F5B] rounded-lg text-[14px] font-medium hover:border-[#BA0000] hover:text-[#BA0000] transition-colors">
              <i className="fa-solid fa-chart-simple text-[#919EAB]"></i> Kết quả & Thống kê
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#454F5B] rounded-lg text-[14px] font-medium hover:border-[#BA0000] hover:text-[#BA0000] transition-colors">
              <i className="fa-solid fa-lightbulb text-[#919EAB]"></i> Kinh nghiệm chơi số
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#454F5B] rounded-lg text-[14px] font-medium hover:border-[#BA0000] hover:text-[#BA0000] transition-colors">
              <i className="fa-solid fa-calendar-check text-[#919EAB]"></i> Sự kiện & Khuyến mãi
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E8EB] text-[#454F5B] rounded-lg text-[14px] font-medium hover:border-[#BA0000] hover:text-[#BA0000] transition-colors">
              <i className="fa-regular fa-newspaper text-[#919EAB]"></i> Tin tức Đại Phát
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Content (Wider) */}
            <div className="flex-1 min-w-0">
              {/* Featured Article */}
              <div className="flex flex-col md:flex-row bg-white rounded-xl overflow-hidden shadow-[0_4px_24px_rgb(0,0,0,0.04)] mb-6">
                <div className="w-full md:w-[50%] h-[240px] md:h-[300px] shrink-0">
                  <img src="/assets/img/blog/blog-post-1.jpg" alt="Kết quả xổ số" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-6 flex flex-col justify-center">
                  <span className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#BA0000] text-[12px] font-bold rounded-md mb-4 w-fit">
                    KẾT QUẢ & THỐNG KÊ
                  </span>
                  <h2 className="text-[22px] md:text-[24px] font-bold text-[#212B36] leading-[1.3] mb-4">
                    <Link to="#" className="hover:text-[#BA0000] transition-colors">Kết quả xổ số hôm nay 09/05/2025 – Kiên Giang 2K2</Link>
                  </h2>
                  <p className="text-[15px] text-[#637381] leading-relaxed mb-6">
                    Cập nhật kết quả xổ số Kiên Giang 2K2 hôm nay 09/05/2025 nhanh chóng, chính xác nhất.
                  </p>
                  <div className="flex items-center gap-6 text-[13px] text-[#919EAB]">
                    <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> 09/05/2025</span>
                    <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 12.458 lượt xem</span>
                  </div>
                </div>
              </div>

              {/* Normal Articles List */}
              <div className="flex flex-col gap-5">
                {/* Item 1 */}
                <div className="flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-shadow">
                  <div className="w-full sm:w-[325px] h-[160px] shrink-0 p-3">
                    <img src="/assets/img/blog/blog-post-2.jpg" alt="Thống kê" className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="flex-1 p-5 sm:pl-2 flex flex-col justify-center">
                    <span className="inline-block px-2.5 py-1 bg-[#F0F5FF] text-[#1890FF] text-[11px] font-bold rounded mb-2.5 w-fit uppercase">
                      Kết quả & Thống kê
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="#" className="hover:text-[#BA0000] transition-colors">Thống kê và phân tích kết quả xổ số Kiên Giang 30 ngày gần đây</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Phân tích tần suất xuất hiện các cặp số, bộ số và đặc biệt trong 30 ngày qua để giúp bạn tham khảo tốt hơn.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> 08/05/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 8.752 lượt xem</span>
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-shadow">
                  <div className="w-full sm:w-[325px] h-[160px] shrink-0 p-3">
                    <img src="/assets/img/blog/blog-post-3.jpg" alt="Kinh nghiệm" className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="flex-1 p-5 sm:pl-2 flex flex-col justify-center">
                    <span className="inline-block px-2.5 py-1 bg-[#FFF7E6] text-[#FA8C16] text-[11px] font-bold rounded mb-2.5 w-fit uppercase">
                      Kinh nghiệm chơi số
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="#" className="hover:text-[#BA0000] transition-colors">Bí quyết chọn số may mắn theo ngày sinh hiệu quả</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Hướng dẫn cách chọn số theo ngày sinh, mệnh ngũ hành giúp tăng cơ hội trúng thưởng.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> 07/05/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 6.341 lượt xem</span>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden shadow-[0_2px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-shadow">
                  <div className="w-full sm:w-[325px] h-[160px] shrink-0 p-3">
                    <img src="/assets/img/blog/blog-post-4.jpg" alt="Khuyến mãi" className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="flex-1 p-5 sm:pl-2 flex flex-col justify-center">
                    <span className="inline-block px-2.5 py-1 bg-[#F9F0FF] text-[#722ED1] text-[11px] font-bold rounded mb-2.5 w-fit uppercase">
                      Sự kiện & Khuyến mãi
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="#" className="hover:text-[#BA0000] transition-colors">Khuyến mãi đặc biệt tháng 5 – Mua vé ngay, trúng lớn mỗi ngày!</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Nhiều chương trình khuyến mãi hấp dẫn đang chờ bạn. Mua vé dễ dàng, nhận ngay cơ hội trúng thưởng giá trị.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> 06/05/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 5.120 lượt xem</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex justify-center items-center gap-2 mt-10">
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#BA0000] hover:border-[#BA0000] transition-colors">
                  <i className="fa-solid fa-chevron-left text-[12px]"></i>
                </button>
                <button className="w-9 h-9 flex items-center justify-center bg-[#FFF4F4] border border-[#BA0000] rounded-lg text-[#BA0000] font-semibold">1</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#BA0000] hover:border-[#BA0000] transition-colors font-medium">2</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#BA0000] hover:border-[#BA0000] transition-colors font-medium">3</button>
                <span className="text-[#919EAB] px-1">...</span>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#BA0000] hover:border-[#BA0000] transition-colors font-medium">10</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#BA0000] hover:border-[#BA0000] transition-colors">
                  <i className="fa-solid fa-chevron-right text-[12px]"></i>
                </button>
              </div>
            </div>

            {/* Right Content (Sidebar - Narrower) */}
            <div className="w-full lg:w-[320px] shrink-0">
              <BlogCategoryWidget activeCategoryName="Tất cả tin tức" />
              <BlogFeaturedWidget />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};


