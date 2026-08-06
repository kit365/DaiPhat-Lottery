"use client";

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { RightSidebarBlog } from './BlogSidebar';
import { usePublicCategories, usePublicPosts } from '../hooks/useBlog';
import { Pagination } from '../../../components/common/Pagination';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';
import { BlogHeroSection } from './BlogHeroSection';
import { BlogSearchFilter } from './BlogSearchFilter';
import { BlogPostCard } from './BlogPostCard';

export const BlogListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL States
  const categorySlug = searchParams.get('category') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchKeyword = searchParams.get('q') || '';
  const sortLabel = searchParams.get('sort') || 'Mới nhất';

  // Fetch categories to map slug to categoryId
  const { data: categories = [] } = usePublicCategories();
  const selectedCategory = categories.find((c) => c.slug === categorySlug);

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
    direction,
  });

  const handleSearchSubmit = (keyword: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (keyword) {
      newParams.set('q', keyword);
    } else {
      newParams.delete('q');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSortChange = (label: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', label);
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
      <main className="pt-[148px] pb-[100px] lg:pt-[100px] lg:pb-12">

        {/* Hero Section */}
        <BlogHeroSection selectedCategory={selectedCategory} />

        {/* Main Content */}
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 mt-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Content */}
            <div className="flex-1 min-w-0 bg-white rounded-2xl p-4 md:p-6 shadow-[0_2px_24px_rgb(0,0,0,0.02)]">
              {/* Search and Sort */}
              <BlogSearchFilter
                searchKeyword={searchKeyword}
                sortLabel={sortLabel}
                onSearchSubmit={handleSearchSubmit}
                onSortChange={handleSortChange}
              />

              {/* Articles List */}
              {isLoading ? (
                <div className="py-20 text-center text-[#919EAB]">Đang tải danh sách bài viết...</div>
              ) : records.length === 0 ? (
                <div className="py-20 text-center text-[#919EAB]">Không tìm thấy bài viết nào phù hợp.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {records.map((post, idx) => (
                    <BlogPostCard key={post.id} post={post} isFirst={idx === 0} />
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
