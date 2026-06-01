import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/header';
import { BlogCategoryWidget, BlogFeaturedWidget } from '../components/blog/BlogSidebar';

export const BlogDetailPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif] pb-20">
      <Header />
      
      <main className="pt-28">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          {/* Breadcrumb */}
          <div className="flex items-center flex-wrap gap-2 text-[14px] text-[#637381] mb-8">
            <Link to="/" className="hover:text-[#BA0000] transition-colors">Trang chủ</Link>
            <span className="text-[12px]">&gt;</span>
            <Link to="/blogs" className="hover:text-[#BA0000] transition-colors">Tin tức</Link>
            <span className="text-[12px]">&gt;</span>
            <Link to="/blogs" className="hover:text-[#BA0000] transition-colors">Bí quyết</Link>
            <span className="text-[12px]">&gt;</span>
            <span className="text-[#212B36] font-medium truncate max-w-[300px] md:max-w-full">Bí quyết chọn số may mắn theo ngày sinh hiệu quả</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Content (Wider) */}
            <div className="flex-1 min-w-0 bg-white rounded-xl shadow-[0_4px_24px_rgb(0,0,0,0.02)] p-6 md:p-10">
              
              <span className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#BA0000] text-[12px] font-bold rounded-md mb-4 w-fit uppercase">
                BÍ QUYẾT
              </span>
              
              <h1 className="text-[28px] md:text-[36px] font-bold text-[#212B36] leading-[1.3] mb-6">
                Bí quyết chọn số may mắn theo ngày sinh hiệu quả
              </h1>
              
              {/* Meta Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E5E8EB]">
                <div className="flex items-center flex-wrap gap-5 text-[14px] text-[#637381]">
                  <span className="flex items-center gap-2"><i className="fa-regular fa-calendar"></i> 05/05/2025</span>
                  <span className="flex items-center gap-2"><i className="fa-regular fa-eye"></i> 6.341 lượt xem</span>
                  <span className="flex items-center gap-2"><i className="fa-regular fa-clock"></i> 5 phút đọc</span>
                </div>
              </div>

              {/* Main Image */}
              <div className="mb-8 rounded-xl overflow-hidden">
                <img src="/assets/img/blog/blog-post-3.jpg" alt="Featured" className="w-full h-auto object-cover max-h-[500px]" />
              </div>

              {/* Article Content */}
              <div className="text-[16px] text-[#454F5B] leading-[1.8]">
                <p className="mb-6 text-[17px] font-medium text-[#212B36]">
                  Chọn số may mắn theo ngày sinh là một phương pháp được nhiều người yêu thích và áp dụng khi chơi xổ số. Phương pháp này không chỉ đơn giản, dễ thực hiện mà còn mang tính cá nhân hóa cao, giúp bạn cảm thấy tự tin hơn khi lựa chọn con số cho mình.
                </p>

                <h3 className="text-[20px] font-bold text-[#212B36] mt-8 mb-4">1. Ý nghĩa của việc chọn số theo ngày sinh</h3>
                <p className="mb-6">
                  Ngày sinh của mỗi người gắn liền với những con số đặc biệt theo phong thủy và thần số học. Những con số này được cho là mang năng lượng tích cực, hỗ trợ và thu hút may mắn, tài lộc cho chủ nhân.
                </p>

                <div className="bg-[#FFF4F4] rounded-xl p-5 mb-6 flex gap-4 items-start">
                  <div className="text-[#BA0000] text-[24px] mt-1 shrink-0"><i className="fa-regular fa-lightbulb"></i></div>
                  <div>
                    <h4 className="text-[16px] font-bold text-[#212B36] mb-1">Mẹo nhỏ</h4>
                    <p className="text-[15px] text-[#454F5B] m-0">Kết hợp số ngày, tháng, năm sinh sẽ giúp bạn tìm ra những con số phù hợp nhất với bản thân.</p>
                  </div>
                </div>

                <h3 className="text-[20px] font-bold text-[#212B36] mt-8 mb-4">2. Cách tính con số may mắn từ ngày sinh</h3>
                <p className="mb-6">
                  Bạn có thể tính con số may mắn theo ngày sinh bằng cách cộng các chữ số trong ngày sinh dương lịch cho đến khi còn một chữ số.
                </p>

                <div className="bg-[#FAFBFC] border border-[#E5E8EB] rounded-xl p-5 mb-6 flex gap-4 items-start">
                  <div className="text-[#BA0000] text-[20px] mt-1 shrink-0"><i className="fa-solid fa-bullseye"></i></div>
                  <div>
                    <h4 className="text-[16px] font-bold text-[#212B36] mb-2">Ví dụ minh họa</h4>
                    <p className="text-[15px] text-[#454F5B] mb-1">Ngày sinh: 15/08/1990</p>
                    <p className="text-[15px] text-[#454F5B] mb-2">Cách tính: 1 + 5 + 0 + 8 + 1 + 9 + 9 + 0 = 33 → 3 + 3 = <strong>6</strong></p>
                    <p className="text-[15px] text-[#212B36] m-0 font-semibold">Con số may mắn: 6</p>
                  </div>
                </div>

                <h3 className="text-[20px] font-bold text-[#212B36] mt-8 mb-4">3. Gợi ý chọn số theo từng con số chủ đạo</h3>
                <p className="mb-4">Dưới đây là ý nghĩa và những cặp số đẹp tương ứng với từng con số chủ đạo:</p>

                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-left text-[15px]">
                    <thead>
                      <tr className="border-b border-[#E5E8EB]">
                        <th className="py-3 px-4 font-semibold text-[#637381]">Con số chủ đạo</th>
                        <th className="py-3 px-4 font-semibold text-[#637381]">Ý nghĩa</th>
                        <th className="py-3 px-4 font-semibold text-[#637381] text-center">Cặp số gợi ý</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#E5E8EB]">
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#BA0000] text-white text-[12px] font-bold">1</span>
                        </td>
                        <td className="py-3 px-4">Sự khởi đầu, độc lập, sáng tạo</td>
                        <td className="py-3 px-4 font-medium text-center">11 - 19 - 28 - 37 - 46</td>
                      </tr>
                      <tr className="border-b border-[#E5E8EB]">
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FF7A00] text-white text-[12px] font-bold">2</span>
                        </td>
                        <td className="py-3 px-4">Cân bằng, hợp tác, nhạy cảm</td>
                        <td className="py-3 px-4 font-medium text-center">02 - 20 - 29 - 38 - 47</td>
                      </tr>
                      <tr className="border-b border-[#E5E8EB]">
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FFB800] text-white text-[12px] font-bold">3</span>
                        </td>
                        <td className="py-3 px-4">Sáng tạo, vui vẻ, lạc quan</td>
                        <td className="py-3 px-4 font-medium text-center">03 - 12 - 21 - 30 - 39</td>
                      </tr>
                      <tr className="border-b border-[#E5E8EB]">
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#36B37E] text-white text-[12px] font-bold">4</span>
                        </td>
                        <td className="py-3 px-4">Ổn định, thực tế, kỷ luật</td>
                        <td className="py-3 px-4 font-medium text-center">04 - 13 - 22 - 31 - 40</td>
                      </tr>
                      <tr className="border-b border-[#E5E8EB]">
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00B8D9] text-white text-[12px] font-bold">5</span>
                        </td>
                        <td className="py-3 px-4">Tự do, linh hoạt, phiêu lưu</td>
                        <td className="py-3 px-4 font-medium text-center">05 - 14 - 23 - 32 - 41</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <Link to="#" className="inline-flex items-center text-[#BA0000] text-[15px] font-medium hover:underline mb-8">
                  Xem thêm ý nghĩa các con số khác <i className="fa-solid fa-chevron-right ml-1 text-[12px]"></i>
                </Link>

                <h3 className="text-[20px] font-bold text-[#212B36] mt-6 mb-4">4. Lưu ý khi chọn số may mắn</h3>
                <ul className="flex flex-col gap-3 mb-8">
                  <li className="flex gap-3 items-start">
                    <i className="fa-regular fa-circle-check text-[#BA0000] mt-1 shrink-0"></i>
                    <span>Không nên quá phụ thuộc, hãy chơi xổ số một cách giải trí và hợp lý.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <i className="fa-regular fa-circle-check text-[#BA0000] mt-1 shrink-0"></i>
                    <span>Kết hợp nhiều phương pháp để tăng cơ hội may mắn.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <i className="fa-regular fa-circle-check text-[#BA0000] mt-1 shrink-0"></i>
                    <span>Luôn chọn những con số mang lại cảm giác tích cực cho bạn.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Content (Sidebar) */}
            <div className="w-full lg:w-[320px] shrink-0 space-y-6">
              {/* Search Box */}
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="Tìm kiếm bài viết..." 
                  className="w-full pl-4 pr-10 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#BA0000] transition-colors shadow-sm"
                />
                <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-[#919EAB]"></i>
              </div>

              <BlogCategoryWidget activeCategoryName="Bí quyết" />
              <BlogFeaturedWidget />

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
