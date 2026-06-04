import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/header';
import { BlogCategoryWidget, BlogFeaturedWidget, BuyTicketBanner } from '../components/blog/BlogSidebar';

const SortDropdown = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState('Mới nhất');
  const options = ['Mới nhất', 'Cũ nhất', 'Xem nhiều'];
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full md:w-[160px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-4 pr-3 py-2.5 bg-white border ${isOpen ? 'border-[#ee1314] shadow-[0_0_0_2px_rgba(238,19,20,0.1)]' : 'border-[#E5E8EB]'} rounded-lg text-[14px] text-[#212B36] font-medium outline-none transition-all hover:border-[#ee1314]`}
      >
        {selected}
        <i className={`fa-solid fa-chevron-down text-[#919EAB] text-[12px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-full bg-white border border-[#E5E8EB] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden z-20 py-1 animate-in fade-in zoom-in-95 duration-200 origin-top">
          {options.map(option => (
            <div
              key={option}
              onClick={() => {
                setSelected(option);
                setIsOpen(false);
              }}
              className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors flex items-center justify-between ${selected === option ? 'bg-[#FFF4F4] text-[#ee1314] font-semibold' : 'text-[#454F5B] hover:bg-[#F4F6F8]'}`}
            >
              {option}
              {selected === option && <i className="fa-solid fa-check text-[12px]"></i>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const BlogListPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#fdfafa] font-['Inter',sans-serif] pb-20">
      <Header />

      <main className="pt-[80px]">
        {/* Hero Section */}
        <div
          className="relative w-full aspect-[937/134] bg-cover bg-center bg-no-repeat flex items-center"
          style={{ backgroundImage: 'url("https://cdn.phototourl.com/free/2026-06-04-d2a5e8c8-8df8-4e9c-9e68-ec6b633e5fc1.png")' }}
        >
          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 lg:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[14px] text-[#637381] mb-2">
              <Link to="/" className="hover:text-[#ee1314] transition-colors">Trang chủ</Link>
              <span className="text-[12px]">&gt;</span>
              <span className="text-[#212B36] font-medium">Bài viết</span>
            </div>

            <h1 className="text-[32px] md:text-[36px] font-bold text-[#212B36] m-0 mb-2">Bài viết</h1>
            <p className="text-[#637381] text-[15px]">
              Cập nhật tin tức, kinh nghiệm và thông tin hữu ích mỗi ngày
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 mt-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Content */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl p-4 md:p-6 shadow-[0_2px_24px_rgb(0,0,0,0.02)]">
              {/* Search and Sort */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài viết..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E8EB] rounded-lg text-[14px] outline-none focus:border-[#ee1314] transition-colors"
                  />
                  <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#919EAB]"></i>
                </div>
                <SortDropdown />
              </div>

              {/* Articles List */}
              <div className="flex flex-col gap-4">
                {/* Item 1 */}
                <div className="flex flex-col sm:flex-row bg-white overflow-hidden group gap-6">
                  <div className="w-full sm:w-[325px] h-[190px] shrink-0">
                    <img src="/assets/img/blog/blog-post-1.jpg" alt="Kết quả xổ số" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-1">
                    <span className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#ee1314] text-[12px] font-medium rounded-md mb-3 w-fit">
                      Kết quả xổ số
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="/blogs/detail/1" className="hover:text-[#ee1314] transition-colors">Kết quả xổ số hôm nay 09/02/2025 – Cập nhật nhanh chóng, chính xác</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Cập nhật kết quả xổ số hôm nay 09/02/2025 của tất cả các đài trên cả nước. Thông tin nhanh chóng, chính xác và đầy đủ nhất.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> 09/02/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 12.5K lượt xem</span>
                      <Link to="/blogs/detail/1" className="ml-auto text-[#ee1314] font-semibold hover:underline">Đọc tiếp <i className="fa-solid fa-arrow-right text-[12px] ml-1"></i></Link>
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="w-full h-[1px] bg-[#F4F6F8]"></div>
                <div className="flex flex-col sm:flex-row bg-white overflow-hidden group gap-6">
                  <div className="w-full sm:w-[325px] h-[190px] shrink-0">
                    <img src="/assets/img/blog/blog-post-2.jpg" alt="Kinh nghiệm chơi số" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-1">
                    <span className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#ee1314] text-[12px] font-medium rounded-md mb-3 w-fit">
                      Kinh nghiệm chơi số
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="/blogs/detail/1" className="hover:text-[#ee1314] transition-colors">Thần tài gõ cửa: Những con số may mắn hôm nay 09/02/2025</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Tham khảo những con số may mắn được chuyên gia dự đoán cho ngày 09/02/2025 để tăng cơ hội trúng lớn.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> 09/02/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 8.7K lượt xem</span>
                      <Link to="/blogs/detail/1" className="ml-auto text-[#ee1314] font-semibold hover:underline">Đọc tiếp <i className="fa-solid fa-arrow-right text-[12px] ml-1"></i></Link>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="w-full h-[1px] bg-[#F4F6F8]"></div>
                <div className="flex flex-col sm:flex-row bg-white overflow-hidden group gap-6">
                  <div className="w-full sm:w-[325px] h-[190px] shrink-0">
                    <img src="/assets/img/blog/blog-post-3.jpg" alt="Kinh nghiệm" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-1">
                    <span className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#ee1314] text-[12px] font-medium rounded-md mb-3 w-fit">
                      Kinh nghiệm chơi số
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="/blogs/detail/1" className="hover:text-[#ee1314] transition-colors">Cách chọn số theo ngày sinh mang lại may mắn và tài lộc</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Hướng dẫn cách chọn số theo ngày sinh đơn giản, dễ áp dụng và được nhiều người tin tưởng mang lại may mắn.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> 09/02/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 15.3K lượt xem</span>
                      <Link to="/blogs/detail/1" className="ml-auto text-[#ee1314] font-semibold hover:underline">Đọc tiếp <i className="fa-solid fa-arrow-right text-[12px] ml-1"></i></Link>
                    </div>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="w-full h-[1px] bg-[#F4F6F8]"></div>
                <div className="flex flex-col sm:flex-row bg-white overflow-hidden group gap-6">
                  <div className="w-full sm:w-[325px] h-[190px] shrink-0">
                    <img src="/assets/img/blog/blog-post-4.jpg" alt="Soi cầu" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-1">
                    <span className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#ee1314] text-[12px] font-medium rounded-md mb-3 w-fit">
                      Soi cầu
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="/blogs/detail/1" className="hover:text-[#ee1314] transition-colors">Soi cầu xổ số miền Nam 09/02/2025 – Dự đoán bạch thủ, song thủ</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Phân tích, soi cầu xổ số miền Nam 09/02/2025 với những con số bạch thủ, song thủ tiềm năng nhất.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> 08/02/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 9.1K lượt xem</span>
                      <Link to="/blogs/detail/1" className="ml-auto text-[#ee1314] font-semibold hover:underline">Đọc tiếp <i className="fa-solid fa-arrow-right text-[12px] ml-1"></i></Link>
                    </div>
                  </div>
                </div>

                {/* Item 5 */}
                <div className="w-full h-[1px] bg-[#F4F6F8]"></div>
                <div className="flex flex-col sm:flex-row bg-white overflow-hidden group gap-6">
                  <div className="w-full sm:w-[325px] h-[190px] shrink-0">
                    <img src="/assets/img/blog/blog-post-1.jpg" alt="Tin tức" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-1">
                    <span className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#ee1314] text-[12px] font-medium rounded-md mb-3 w-fit">
                      Tin tức
                    </span>
                    <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                      <Link to="/blogs/detail/1" className="hover:text-[#ee1314] transition-colors">Mua vé số Online – Tiện lợi, nhanh chóng, bảo mật 100%</Link>
                    </h3>
                    <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                      Mua vé số online tại Đại Phát dễ dàng, nhanh chóng với nhiều ưu đãi hấp dẫn và cam kết bảo mật tuyệt đối.
                    </p>
                    <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> 09/02/2025</span>
                      <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 6.2K lượt xem</span>
                      <Link to="/blogs/detail/1" className="ml-auto text-[#ee1314] font-semibold hover:underline">Đọc tiếp <i className="fa-solid fa-arrow-right text-[12px] ml-1"></i></Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex justify-center items-center gap-2 mt-10">
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors shadow-sm">
                  <i className="fa-solid fa-angles-left text-[12px]"></i>
                </button>
                <button className="w-9 h-9 flex items-center justify-center bg-[#ee1314] border border-[#ee1314] rounded-lg text-white font-semibold shadow-md">1</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors font-medium shadow-sm">2</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors font-medium shadow-sm">3</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors font-medium shadow-sm">4</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors font-medium shadow-sm">5</button>
                <span className="text-[#919EAB] px-1">...</span>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors font-medium shadow-sm">20</button>
                <button className="w-9 h-9 flex items-center justify-center bg-white border border-[#E5E8EB] rounded-lg text-[#454F5B] hover:text-[#ee1314] hover:border-[#ee1314] transition-colors shadow-sm">
                  <i className="fa-solid fa-angles-right text-[12px]"></i>
                </button>
              </div>
            </div>

            {/* Right Content (Sidebar) */}
            <div className="w-full lg:w-[340px] shrink-0">
              <BlogCategoryWidget activeCategoryName="Tất cả bài viết" />
              <BlogFeaturedWidget />
              <BuyTicketBanner />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
