import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from 'react-router-dom';
import { PublicPost } from '../types/blog';

interface BlogPostCardProps {
  post: PublicPost;
  isFirst?: boolean;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(
      d.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
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

export const BlogPostCard: React.FC<BlogPostCardProps> = ({ post, isFirst = false }) => {
  const [imgSrc, setImgSrc] = useState(post.thumbnail || '/assets/img/blog/blog-post-1.jpg');

  return (
    <React.Fragment>
      {!isFirst && <div className="w-full h-[1px] bg-[#F4F6F8]"></div>}
      <div className="flex flex-col sm:flex-row bg-white overflow-hidden group gap-6">
        <div className="relative w-full sm:w-[325px] h-[190px] shrink-0">
          <Image
            src={imgSrc}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, 325px"
            className="object-cover rounded-xl"
            onError={() => {
              setImgSrc('/assets/img/blog/blog-post-1.jpg');
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
            <Link
              to={`/blogs/detail/${post.slug}`}
              className="hover:text-[#ee1314] transition-colors"
            >
              {post.title}
            </Link>
          </h3>
          <p className="text-[14px] text-[#637381] leading-relaxed mb-4 line-clamp-2">
            {post.summary}
          </p>
          <div className="flex items-center gap-5 text-[13px] text-[#919EAB] mt-auto">
            <span className="flex items-center gap-1.5">
              <i className="fa-regular fa-calendar"></i> {formatDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="fa-regular fa-eye"></i> {formatViews(post.viewCount)}
            </span>
            <Link
              to={`/blogs/detail/${post.slug}`}
              className="ml-auto text-[#ee1314] font-semibold hover:underline"
            >
              Đọc tiếp <i className="fa-solid fa-arrow-right text-[12px] ml-1"></i>
            </Link>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};
