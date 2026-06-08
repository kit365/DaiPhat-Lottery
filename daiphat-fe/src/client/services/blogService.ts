import { apiApp } from '../../api';

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  avatar: string;
  postCount: number;
}

export interface PublicPost {
  id: number;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  viewCount: number;
  publishedAt: string;
}

export interface PaginatedResponse<T> {
  recordList: T[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    isFirst: boolean;
    isLast: boolean;
  };
}

export const getPublicCategories = async (): Promise<PublicCategory[]> => {
  const response = await apiApp.get('/blogs/categories/public');
  return response.data.data;
};

export const getPublicPosts = async (params: {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: number | string;
  sortBy?: string;
  direction?: string;
}): Promise<PaginatedResponse<PublicPost>> => {
  const response = await apiApp.get('/blogs/public', { params });
  return response.data.data;
};

export interface PublicPostDetail extends PublicPost {
  content: string;
  tags: {
    id: number;
    name: string;
    slug: string;
  }[];
}

export const getPublicPostBySlug = async (slug: string): Promise<PublicPostDetail> => {
  const response = await apiApp.get(`/blogs/public/${slug}`);
  return response.data.data;
};

export const getRelatedPublicPosts = async (slug: string, limit: number = 4): Promise<PublicPost[]> => {
  const response = await apiApp.get(`/blogs/public/${slug}/related`, { params: { limit } });
  return response.data.data;
};

export const incrementPostView = async (id: number): Promise<void> => {
  await apiApp.patch(`/blogs/${id}/view`);
};
