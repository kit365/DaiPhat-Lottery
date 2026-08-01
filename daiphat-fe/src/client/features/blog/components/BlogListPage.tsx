import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../../../components/layout/header';
import { RightSidebarBlog } from './BlogSidebar';
import { usePublicCategories, usePublicPosts } from '../hooks/useBlog';
import { Pagination } from '../../../components/common/Pagination';

interface SortDropdownProps {
  selectedLabel: string;
  onSelect: (label: string) => void;
}

const SortDropdown = ({ selectedLabel, onSelect }: SortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = ['Mới nhất', 'Cũ nhất', 'Xem nhiều'];
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-4 pr-3 py-2.5 bg-white border ${isOpen ? 'border-[#ee1314] shadow-[0_0_0_2px_rgba(238,19,20,0.1)]' : 'border-[#E5E8EB]'} rounded-lg text-[14px] text-[#212B36] font-medium outline-none transition-all hover:border-[#ee1314]`}
      >
        {selectedLabel}
        <i className={`fa-solid fa-chevron-down text-[#919EAB] text-[12px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-full bg-white border border-[#E5E8EB] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden z-20 py-1 animate-in fade-in zoom-in-95 duration-200 origin-top">
          {options.map(option => (
            <button
              type="button"
              key={option}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-[14px] cursor-pointer transition-colors flex items-center justify-between ${selectedLabel === option ? 'bg-[#FFF4F4] text-[#ee1314] font-semibold' : 'text-[#454F5B] hover:bg-[#F4F6F8]'}`}
            >
              {option}
              {selectedLabel === option && <i className="fa-solid fa-check text-[12px]"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

export const BlogListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL States
  const categorySlug = searchParams.get('category') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchKeyword = searchParams.get('q') || '';
  const sortLabel = searchParams.get('sort') || 'Mới nhất';

  const [searchInput, setSearchInput] = useState(searchKeyword);

  // Synchronize input value with search param
  useEffect(() => {
    setSearchInput(searchKeyword);
  }, [searchKeyword]);

  // Fetch categories to map slug to categoryId
  const { data: categories = [] } = usePublicCategories();
  const selectedCategory = categories.find(c => c.slug === categorySlug);

  // Resolve sort order
  let sortBy = 'createdAt';
  let direction = 'desc';
  if (sortLabel === 'Cũ nhất') {
    sortBy = 'createdAt';
    direction = 'asc';
  } else if (sortLabel === 'Xem nhiều') {
    sortBy = 'viewCount';
    direction = 'desc';
  }

  // Fetch public posts
  const limit = 5;
  const { data: postsData, isLoading } = usePublicPosts({
    page,
    limit,
    q: searchKeyword,
    categoryId: selectedCategory?.id,
    sortBy,
    direction
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('q', searchInput.trim());
    } else {
      newParams.delete('q');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSortChange = (label: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', label);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  const activeCategoryName = selectedCategory ? selectedCategory.name : 'Tất cả bài viết';
  const activeCategoryId = selectedCategory ? selectedCategory.id : 'all';

  const records = postsData?.recordList || [];
  const pagination = postsData?.pagination;
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="client-page min-h-screen">
      <Header />

      <main className="pt-[80px]">
        {/* Hero Section */}
        <div
          className="relative w-full aspect-[937/134] bg-cover bg-center bg-no-repeat flex items-center"
          style={{ backgroundImage: 'url("https://cdn.phototourl.com/free/2026-06-04-d2a5e8c8-8df8-4e9c-9e68-ec6b633e5fc1.png")' }}
        >
          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 lg:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[13px] text-[#637381] mb-2">
              <Link to="/" className="hover:text-[#ee1314] transition-colors">Trang chủ</Link>
              <span className="text-[12px]">&gt;</span>
              <span className="text-[#212B36] font-medium">Bài viết</span>
              {selectedCategory && (
                <>
                  <span className="text-[12px]">&gt;</span>
                  <span className="text-[#212B36] font-medium">{selectedCategory.name}</span>
                </>
              )}
            </div>

            <h1 className="client-heading m-0 mb-2">
              {selectedCategory ? selectedCategory.name : 'Bài viết'}
            </h1>
            <p className="text-[#637381] text-[13px]">
              {(selectedCategory as any)?.description || 'Cập nhật tin tức, kinh nghiệm và thông tin hữu ích mỗi ngày'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 mt-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Content */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl p-4 md:p-6 shadow-[0_2px_24px_rgb(0,0,0,0.02)]">
              {/* Search and Sort */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tìm kiếm bài viết..."
                    className="client-input focus:outline-none focus:ring-0"
                    style={{ paddingLeft: '42px', outline: 'none' }}
                  />
                  <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#919EAB]"></i>
                </div>
                <SortDropdown selectedLabel={sortLabel} onSelect={handleSortChange} />
              </form>

              {/* Articles List */}
              {isLoading ? (
                <div className="py-20 text-center text-[#919EAB]">Đang tải danh sách bài viết...</div>
              ) : records.length === 0 ? (
                <div className="py-20 text-center text-[#919EAB]">Không tìm thấy bài viết nào phù hợp.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {records.map((post, idx) => (
                    <React.Fragment key={post.id}>
                      {idx > 0 && <div className="w-full h-[1px] bg-[#F4F6F8]"></div>}
                      <div className="flex flex-col sm:flex-row bg-white overflow-hidden group gap-6">
                        <div className="w-full sm:w-[325px] h-[190px] shrink-0">
                          <img 
                            src={post.thumbnail || '/assets/img/blog/blog-post-1.jpg'} 
                            alt={post.title} 
                            className="w-full h-full object-cover rounded-xl" 
                            style={{ objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/img/blog/blog-post-1.jpg';
                            }}
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-center py-1">
                          {post.category && (
                            <Link 
                              to={`/blogs?category=${post.category.slug}`}
                              className="inline-block px-3 py-1 bg-[#FFF4F4] text-[#ee1314] text-[12px] font-medium rounded-md mb-3 w-fit hover:bg-[#ee1314] hover:text-white transition-colors"
                            >
                              {post.category.name}
                            </Link>
                          )}
                          <h3 className="text-[18px] font-bold text-[#212B36] leading-[1.4] mb-2">
                            <Link to={`/blogs/detail/${post.slug}`} className="hover:text-[#ee1314] transition-colors">{post.title}</Link>
                          </h3>
                          <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
                            {post.summary}
                          </p>
                          <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
                            <span className="flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> {formatDate(post.publishedAt)}</span>
                            <span className="flex items-center gap-1.5"><i className="fa-regular fa-eye"></i> {formatViews(post.viewCount)}</span>
                            <Link to={`/blogs/detail/${post.slug}`} className="ml-auto text-[#ee1314] font-semibold hover:underline">Đọc tiếp <i className="fa-solid fa-arrow-right text-[12px] ml-1"></i></Link>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalRecords={pagination?.totalRecords || 0}
                  limit={limit}
                />
              )}
            </div>

            {/* Right Content (Sidebar) */}
            <RightSidebarBlog activeCategoryName={activeCategoryName} activeCategoryId={activeCategoryId} />
          </div>
        </div>
      </main>
    </div>
  );
};
