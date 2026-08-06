import React from 'react';
import { Breadcrumb } from '../../../components/ui/Breadcrumb';

interface BlogHeroSectionProps {
  selectedCategory?: {
    name: string;
    slug?: string;
    description?: string;
  } | null;
}

export const BlogHeroSection: React.FC<BlogHeroSectionProps> = ({ selectedCategory }) => {
  return (
    <div
      className="relative w-full aspect-[937/134] bg-cover bg-center bg-no-repeat flex items-center"
      style={{
        backgroundImage:
          'url("https://cdn.phototourl.com/free/2026-06-04-d2a5e8c8-8df8-4e9c-9e68-ec6b633e5fc1.png")',
      }}
    >
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 lg:px-6">
        <Breadcrumb
          items={[
            { label: 'Trang chủ', to: '/' },
            { label: 'Bài viết', to: selectedCategory ? '/blogs' : undefined },
            ...(selectedCategory ? [{ label: selectedCategory.name }] : [])
          ]}
          className="mb-2"
        />

        <h1 className="client-heading m-0 mb-2">
          {selectedCategory ? selectedCategory.name : 'Bài viết'}
        </h1>
        <p className="text-[#637381] text-[13px]">
          {selectedCategory?.description ||
            'Cập nhật tin tức, kinh nghiệm và thông tin hữu ích mỗi ngày'}
        </p>
      </div>
    </div>
  );
};
