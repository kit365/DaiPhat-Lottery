import { apiApp } from '../../api';
import { PageResponse } from '../../types/api.type';
import { PublicCategory, PublicPost, PublicPostDetail } from '../types/blog';

const BLOG_BASE_URL = '/blogs';
const PUBLIC_BLOG_BASE_URL = `${BLOG_BASE_URL}/public`;
const PUBLIC_CATEGORY_BASE_URL = `${BLOG_BASE_URL}/categories/public`;

export const getPublicCategories = async (): Promise<PublicCategory[]> => {
  const response = await apiApp.get(PUBLIC_CATEGORY_BASE_URL);
  return response.data.data;
};

export const getPublicPosts = async (params: {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: number | string;
  sortBy?: string;
  direction?: string;
}): Promise<PageResponse<PublicPost>> => {
  const response = await apiApp.get(PUBLIC_BLOG_BASE_URL, { params });
  return response.data.data;
};

export const getPublicPostBySlug = async (slug: string): Promise<PublicPostDetail> => {
  const response = await apiApp.get(`${PUBLIC_BLOG_BASE_URL}/${slug}`);
  return response.data.data;
};

export const getRelatedPublicPosts = async (slug: string, limit: number = 4): Promise<PublicPost[]> => {
  const response = await apiApp.get(`${PUBLIC_BLOG_BASE_URL}/${slug}/related`, {
    params: { limit },
  });
  return response.data.data;
};

export const incrementPostView = async (id: number): Promise<void> => {
  await apiApp.patch(`${BLOG_BASE_URL}/${id}/view`);
};
