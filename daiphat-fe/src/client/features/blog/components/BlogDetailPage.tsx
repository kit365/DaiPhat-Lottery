import React, { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '../../../components/layout/header';
import { RightSidebarBlog } from './BlogSidebar';
import { usePublicPostBySlug, useRelatedPublicPosts, useIncrementPostView } from '../hooks/useBlog';
import { useBlogDetail } from '../../../../admin/features/blogs/hooks/useBlog';

export const BlogDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('previewId');
  const navigate = useNavigate();

  const { data: publicPost, isLoading: isLoadingPublic, isError: isErrorPublic } = usePublicPostBySlug(!previewId ? slug : undefined);
  const { data: adminPost, isLoading: isLoadingAdmin, isError: isErrorAdmin } = useBlogDetail(previewId || undefined);

  let post: any = publicPost;
  if (previewId && adminPost) {
    post = {
      ...adminPost,
      summary: adminPost.description,
      thumbnail: adminPost.avatar || adminPost.thumbnail,
      category: adminPost.categoryRaw,
      tags: adminPost.tagsRaw,
    };
  }

  const isLoading = previewId ? isLoadingAdmin : isLoadingPublic;
  const isError = previewId ? isErrorAdmin : isErrorPublic;
  const { data: relatedPosts } = useRelatedPublicPosts(slug);
  const { mutate: incrementView } = useIncrementPostView();

  useEffect(() => {
    if (post?.id && !previewId) {
      incrementView(post.id);
    }
  }, [post?.id, incrementView, previewId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K lượt xem`;
    }
    return `${views} lượt xem`;
  };

  if (isLoading) {
    return (
      <div className="client-page min-h-screen pb-20">
        <Header />
        <main className="pt-[80px]">
          <div className="py-20 text-center text-[#919EAB]">Đang tải chi tiết bài viết...</div>
        </main>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="client-page min-h-screen pb-20">
        <Header />
        <main className="pt-[80px]">
          <div className="py-20 text-center text-[#919EAB]">Không tìm thấy bài viết hoặc đã xảy ra lỗi.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="client-page min-h-screen pb-20">
      <Header />

      <main className="pt-[80px]">
        {/* Hero Section */}
        <div
          className="relative w-full aspect-[1440/320] bg-cover bg-center bg-no-repeat flex items-center mb-8"
          style={{ backgroundImage: `url("${post.thumbnail || 'https://cdn.phototourl.com/free/2026-06-04-d2a5e8c8-8df8-4e9c-9e68-ec6b633e5fc1.png'}")` }}
        >
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-black/40"></div>

          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 lg:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] text-white/80 mb-4">
              <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
              <span className="text-[14px] mx-1">&gt;</span>
              <Link to="/blogs" className="hover:text-white transition-colors">Bài viết</Link>
              <span className="text-[14px] mx-1">&gt;</span>
              <span className="text-white font-medium">{post.category?.name || 'Chi tiết'}</span>
            </div>

            <div className="max-w-[700px]">
              <h1 className="text-[24px] md:text-[28px] font-bold text-white leading-[1.3] mb-4">
                {post.title}
              </h1>

              <p className="text-[13px] text-white/90 leading-[1.6] mb-6">
                {post.summary}
              </p>

              {/* Meta Info */}
              <div className="flex items-center flex-wrap gap-5 text-[13px] text-white/90">
                <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> {formatDate(post.publishedAt)}</span>
                <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> {formatViews(post.viewCount)}</span>
                {post.category && <span className="flex items-center gap-1.5"><i className="fa-solid fa-tag"></i> {post.category.name}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Left Content Area */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
              <div className="flex-1 min-w-0 p-6 lg:p-8">
                {/* Dynamically render HTML content */}
                <div
                  className="prose max-w-none text-[15px] text-[#454F5B] leading-[1.8] blog-content-html"
                  dangerouslySetInnerHTML={{ __html: post.content || '' }}
                />

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    <span className="font-bold text-[#212B36] mr-2">Tags:</span>
                    {post.tags.map(tag => (
                      <span key={tag.id} className="px-3 py-1 bg-[#F4F6F8] text-[#454F5B] text-[13px] rounded-full hover:bg-[#E5E8EB] transition-colors cursor-pointer">
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Share Section */}
              <div className="border-t border-[#E5E8EB] p-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                <span className="text-[15px] font-bold text-[#212B36]">Chia sẻ bài viết</span>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E8EB] rounded-full text-[13px] font-medium text-[#454F5B] hover:border-[#1877F2] hover:text-[#1877F2] transition-colors">
                    <i className="fa-brands fa-facebook text-[#1877F2] text-[15px]"></i> Facebook
                  </button>
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E8EB] rounded-full text-[13px] font-medium text-[#454F5B] hover:border-[#0068FF] hover:text-[#0068FF] transition-colors">
                    <span className="font-bold text-white bg-[#0068FF] text-[9px] px-1.5 py-0.5 rounded-full leading-none">Zalo</span> Zalo
                  </button>
                  <button
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E8EB] rounded-full text-[13px] font-medium text-[#454F5B] hover:border-[#212B36] hover:text-[#212B36] transition-colors"
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                  >
                    <i className="fa-solid fa-link text-[#212B36]"></i> Sao chép link
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <RightSidebarBlog activeCategoryName={post.category?.name} hideCategoryCount={true} />
          </div>

          {/* Related Articles Section */}
          {relatedPosts && relatedPosts.length > 0 && (
            <div className="mt-12 mb-8 bg-white rounded-2xl p-6 lg:p-8 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
              <h3 className="text-[20px] font-bold text-[#212B36] mb-6">Bài viết liên quan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedPosts.map(relatedPost => (
                  <div key={relatedPost.id} className="group cursor-pointer" onClick={() => { navigate(`/blogs/detail/${relatedPost.slug}`); }}>
                    <div className="rounded-xl overflow-hidden mb-3 aspect-[16/10]">
                      <img
                        src={relatedPost.thumbnail || '/assets/img/blog/blog-post-1.jpg'}
                        alt={relatedPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/img/blog/blog-post-1.jpg';
                        }}
                      />
                    </div>
                    <h4 className="text-[14px] font-bold text-[#212B36] leading-[1.4] mb-2 group-hover:text-[#ee1314] transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[12px] text-[#919EAB]">
                      <span>{formatViews(relatedPost.viewCount)}</span>
                      <span className="w-1 h-1 rounded-full bg-[#919EAB]"></span>
                      <span>{formatDate(relatedPost.publishedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
