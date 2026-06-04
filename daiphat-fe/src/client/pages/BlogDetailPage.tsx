import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/header';
import { RightSidebarBlog } from '../components/blog/BlogSidebar';

export const BlogDetailPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-['Inter',sans-serif] pb-20">
      <Header />

      <main className="pt-[80px]">
        {/* Hero Section */}
        <div
          className="relative w-full aspect-[1440/320] bg-cover bg-center bg-no-repeat flex items-center mb-8"
          style={{ backgroundImage: 'url("https://cdn.phototourl.com/free/2026-06-04-d2a5e8c8-8df8-4e9c-9e68-ec6b633e5fc1.png")' }}
        >
          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 lg:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] text-[#637381] mb-4">
              <Link to="/" className="hover:text-[#ee1314] transition-colors">Trang chủ</Link>
              <span className="text-[14px] mx-1">&gt;</span>
              <Link to="/blogs" className="hover:text-[#ee1314] transition-colors">Bài viết</Link>
              <span className="text-[14px] mx-1">&gt;</span>
              <span className="text-[#212B36] font-medium">Kinh nghiệm chơi số</span>
            </div>

            <div className="max-w-[700px]">
              <h1 className="text-[28px] md:text-[36px] font-bold text-[#212B36] leading-[1.3] mb-4">
                Cách chọn số theo ngày sinh mang lại may mắn và tài lộc
              </h1>

              <p className="text-[15px] text-[#454F5B] leading-[1.6] mb-6">
                Khám phá cách chọn số theo ngày sinh để thu hút may mắn, tài lộc và tăng cơ hội thành công trong cuộc sống. Hướng dẫn chi tiết, dễ áp dụng cho mọi người.
              </p>

              {/* Meta Info */}
              <div className="flex items-center flex-wrap gap-5 text-[13px] text-[#637381]">
                <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> 09/02/2025</span>
                <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> 15.3K lượt xem</span>
                <span className="flex items-center gap-1.5"><i className="fa-solid fa-tag"></i> Kinh nghiệm chơi số</span>
                <span className="flex items-center gap-1.5"><i className="fa-regular fa-clock"></i> 8 phút đọc</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Left Content Area (One huge white block) */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
              <div className="flex-1 min-w-0 p-6 lg:p-8">

                  <h2 className="text-[20px] font-bold text-[#212B36] mb-4">Giới thiệu</h2>
                  <div className="text-[15px] text-[#454F5B] leading-[1.8] space-y-4">
                    <p>
                      Trong phong thủy và thần số học, mỗi con số đều mang một nguồn năng lượng riêng. Đặc biệt, những con số gắn liền với ngày sinh của bạn có thể mang đến may mắn, tài lộc và giúp bạn đưa ra những quyết định thuận lợi hơn.
                    </p>
                    <p>
                      Bài viết này sẽ hướng dẫn bạn cách tính và chọn số theo ngày sinh đơn giản, dễ áp dụng để thu hút vận may trong cuộc sống.
                    </p>
                  </div>

                  <h3 id="section-1" className="text-[18px] font-bold text-[#212B36] mt-8 mb-4">1. Ý nghĩa của số theo ngày sinh</h3>
                  <div className="text-[15px] text-[#454F5B] leading-[1.8] space-y-4">
                    <p>
                      Mỗi <strong>con số từ 1 đến 9</strong> đều mang một ý nghĩa riêng, tượng trưng cho những đặc điểm và năng lượng khác nhau.
                    </p>
                    <div className="my-6">
                      <img src="https://i.ibb.co/C07B88N/8eb38006-2580-4966-99eb-03350257e9b0.png" alt="Ý nghĩa các con số" className="w-full h-auto rounded-lg" />
                    </div>
                    <p>
                      Khi hiểu rõ ý nghĩa các con số, bạn sẽ dễ dàng lựa chọn những con số phù hợp với bản thân để gia tăng năng lượng tích cực.
                    </p>
                  </div>

                  <h3 id="section-2" className="text-[18px] font-bold text-[#212B36] mt-8 mb-4">2. Cách tính con số chủ đạo</h3>
                  <div className="text-[15px] text-[#454F5B] leading-[1.8] space-y-4">
                    <p>
                      Con số chủ đạo được tính dựa trên tổng các chữ số trong ngày tháng năm sinh của bạn cho đến khi còn một chữ số duy nhất.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 my-6 bg-[#FFF4F4] border border-[#FFE8E8] rounded-2xl p-6 items-center">
                      <div className="flex-1">
                        <h4 className="text-[15px] font-bold text-[#ee1314] mb-2">Ví dụ minh họa</h4>
                        <p className="text-[14px] text-[#454F5B] mb-1">Ngày sinh: 12/05/1995</p>
                        <p className="text-[14px] text-[#454F5B]">1 + 2 + 0 + 5 + 1 + 9 + 9 + 5 = 32<br />3 + 2 = 5</p>
                      </div>
                      <div className="w-full sm:w-[160px] bg-white border border-[#FFE8E8] rounded-xl py-5 px-4 flex flex-col items-center justify-center shrink-0 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
                        <p className="text-[13px] font-semibold text-[#212B36] mb-1">Con số chủ đạo</p>
                        <span className="text-[44px] font-black text-[#ee1314] leading-none">5</span>
                      </div>
                    </div>

                    <div className="bg-[#FFF8E1] border border-[#FFE58F] rounded-2xl p-5 flex gap-4 items-start">
                      <div className="text-[#FAAD14] text-[20px] mt-0.5 shrink-0"><i className="fa-regular fa-lightbulb"></i></div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#212B36] mb-1">Mẹo nhỏ</h4>
                        <p className="text-[13px] text-[#454F5B] leading-[1.6] m-0">Hãy kết hợp con số chủ đạo với những con số bạn yêu thích hoặc có ý nghĩa đặc biệt đối với bạn để tăng thêm sự may mắn và gắn kết.</p>
                      </div>
                    </div>
                  </div>

                  <h3 id="section-3" className="text-[18px] font-bold text-[#212B36] mt-8 mb-4">3. Gợi ý số may mắn theo từng nhóm ngày sinh</h3>
                  <div className="text-[15px] text-[#454F5B] leading-[1.8] space-y-4">
                    <p>Dựa trên con số chủ đạo, bạn có thể tham khảo các cặp số hoặc bộ số may mắn phù hợp để thu hút tài lộc và thuận lợi hơn trong cuộc sống.</p>

                    <div className="overflow-x-auto my-6 border border-[#E5E8EB] rounded-xl">
                      <table className="w-full text-left text-[14px]">
                        <thead className="bg-white">
                          <tr>
                            <th className="py-3 px-4 font-semibold text-[#212B36] text-center border-b border-[#E5E8EB]">Con số chủ đạo</th>
                            <th className="py-3 px-4 font-semibold text-[#212B36] border-b border-[#E5E8EB]">Đặc điểm nổi bật</th>
                            <th className="py-3 px-4 font-semibold text-[#212B36] text-center border-b border-[#E5E8EB]">Gợi ý số may mắn</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">1</td>
                            <td className="py-3 px-4 text-[#454F5B]">Lãnh đạo, độc lập, mạnh mẽ</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">10 - 19 - 01 - 11</td>
                          </tr>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">2</td>
                            <td className="py-3 px-4 text-[#454F5B]">Hài hòa, nhạy cảm, tinh tế</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">20 - 29 - 02 - 22</td>
                          </tr>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">3</td>
                            <td className="py-3 px-4 text-[#454F5B]">Sáng tạo, giao tiếp tốt</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">30 - 39 - 03 - 33</td>
                          </tr>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">4</td>
                            <td className="py-3 px-4 text-[#454F5B]">Kiên định, thực tế, chăm chỉ</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">40 - 49 - 04 - 44</td>
                          </tr>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">5</td>
                            <td className="py-3 px-4 text-[#454F5B]">Tự do, linh hoạt, thích khám phá</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">50 - 59 - 05 - 55</td>
                          </tr>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">6</td>
                            <td className="py-3 px-4 text-[#454F5B]">Trách nhiệm, tình cảm, nhân hậu</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">60 - 69 - 06 - 66</td>
                          </tr>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">7</td>
                            <td className="py-3 px-4 text-[#454F5B]">Trí tuệ, suy tư, sâu sắc</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">70 - 79 - 07 - 77</td>
                          </tr>
                          <tr className="border-b border-[#E5E8EB]">
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">8</td>
                            <td className="py-3 px-4 text-[#454F5B]">Thành công, tham vọng, tài lộc</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">80 - 89 - 08 - 88</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 text-center font-bold text-[#212B36]">9</td>
                            <td className="py-3 px-4 text-[#454F5B]">Nhân ái, vị tha, hướng thiện</td>
                            <td className="py-3 px-4 font-medium text-center text-[#212B36]">90 - 99 - 09 - 99</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <h3 id="section-4" className="text-[18px] font-bold text-[#212B36] mt-8 mb-4">4. Những lưu ý khi chọn số</h3>
                  <ul className="list-disc pl-5 text-[15px] text-[#454F5B] leading-[1.8] space-y-2 mb-8">
                    <li>Chọn số phù hợp với bản mệnh và năng lượng cá nhân.</li>
                    <li>Tránh lạm dụng quá nhiều bộ số cùng lúc.</li>
                    <li>Kết hợp giữa trực giác và lý trí khi lựa chọn con số.</li>
                  </ul>

                  <h3 id="section-5" className="text-[18px] font-bold text-[#212B36] mt-8 mb-4">5. Kết luận</h3>
                  <div className="text-[15px] text-[#454F5B] leading-[1.8] space-y-4 pb-4">
                    <p>
                      Việc chọn số theo ngày sinh là một phương pháp đơn giản nhưng mang lại nhiều lợi ích về mặt tinh thần và năng lượng. Hy vọng bài viết giúp bạn tìm được những con số may mắn, đồng hành và mang lại tài lộc trên hành trình của mình.
                    </p>
                  </div>
                </div>

              {/* Share Section - Full width of the left container */}
              <div className="border-t border-[#E5E8EB] p-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                <span className="text-[15px] font-bold text-[#212B36]">Chia sẻ bài viết</span>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E8EB] rounded-full text-[13px] font-medium text-[#454F5B] hover:border-[#1877F2] hover:text-[#1877F2] transition-colors">
                    <i className="fa-brands fa-facebook text-[#1877F2] text-[15px]"></i> Facebook
                  </button>
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E8EB] rounded-full text-[13px] font-medium text-[#454F5B] hover:border-[#0068FF] hover:text-[#0068FF] transition-colors">
                    <span className="font-bold text-white bg-[#0068FF] text-[9px] px-1.5 py-0.5 rounded-full leading-none">Zalo</span> Zalo
                  </button>
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E8EB] rounded-full text-[13px] font-medium text-[#454F5B] hover:border-[#212B36] hover:text-[#212B36] transition-colors">
                    <i className="fa-solid fa-link text-[#212B36]"></i> Sao chép link
                  </button>
                </div>
              </div>

            </div>

            {/* Right Sidebar */}
            <RightSidebarBlog activeCategoryName="Kinh nghiệm chơi số" hideCategoryCount={true} />
          </div>

          {/* Related Articles Section */}
          <div className="mt-12 mb-8 bg-white rounded-2xl p-6 lg:p-8 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
            <h3 className="text-[20px] font-bold text-[#212B36] mb-6">Bài viết liên quan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Related Post 1 */}
              <div className="group cursor-pointer">
                <div className="rounded-xl overflow-hidden mb-3 aspect-[16/10]">
                  <img src="/assets/img/blog/blog-post-1.jpg" alt="Related" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="text-[14px] font-bold text-[#212B36] leading-[1.4] mb-2 group-hover:text-[#ee1314] transition-colors line-clamp-2">
                  Ý nghĩa các con số trong phong thủy
                </h4>
                <div className="flex items-center gap-3 text-[12px] text-[#919EAB]">
                  <span>12.1K lượt xem</span>
                  <span className="w-1 h-1 rounded-full bg-[#919EAB]"></span>
                  <span>07/02/2025</span>
                </div>
              </div>

              {/* Related Post 2 */}
              <div className="group cursor-pointer">
                <div className="rounded-xl overflow-hidden mb-3 aspect-[16/10]">
                  <img src="/assets/img/blog/blog-post-2.jpg" alt="Related" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="text-[14px] font-bold text-[#212B36] leading-[1.4] mb-2 group-hover:text-[#ee1314] transition-colors line-clamp-2">
                  Những con số may mắn theo 12 con giáp
                </h4>
                <div className="flex items-center gap-3 text-[12px] text-[#919EAB]">
                  <span>9.7K lượt xem</span>
                  <span className="w-1 h-1 rounded-full bg-[#919EAB]"></span>
                  <span>06/02/2025</span>
                </div>
              </div>

              {/* Related Post 3 */}
              <div className="group cursor-pointer">
                <div className="rounded-xl overflow-hidden mb-3 aspect-[16/10]">
                  <img src="/assets/img/blog/blog-post-3.jpg" alt="Related" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="text-[14px] font-bold text-[#212B36] leading-[1.4] mb-2 group-hover:text-[#ee1314] transition-colors line-clamp-2">
                  Cách chọn số theo mệnh để thu hút tài lộc
                </h4>
                <div className="flex items-center gap-3 text-[12px] text-[#919EAB]">
                  <span>14.3K lượt xem</span>
                  <span className="w-1 h-1 rounded-full bg-[#919EAB]"></span>
                  <span>05/02/2025</span>
                </div>
              </div>

              {/* Related Post 4 */}
              <div className="group cursor-pointer">
                <div className="rounded-xl overflow-hidden mb-3 aspect-[16/10]">
                  <img src="/assets/img/blog/blog-post-4.jpg" alt="Related" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <h4 className="text-[14px] font-bold text-[#212B36] leading-[1.4] mb-2 group-hover:text-[#ee1314] transition-colors line-clamp-2">
                  Giải mã ý nghĩa số 68, 79, 86, 39...
                </h4>
                <div className="flex items-center gap-3 text-[12px] text-[#919EAB]">
                  <span>8.6K lượt xem</span>
                  <span className="w-1 h-1 rounded-full bg-[#919EAB]"></span>
                  <span>04/02/2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
