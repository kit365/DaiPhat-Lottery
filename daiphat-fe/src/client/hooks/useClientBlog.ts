import { useQuery } from '@tanstack/react-query';
import { getPublicCategories, getPublicPosts } from '../services/blogService';

export const usePublicCategories = () => {
  return useQuery({
    queryKey: ['public-blog-categories'],
    queryFn: getPublicCategories,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePublicPosts = (params: {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: number | string;
  sortBy?: string;
  direction?: string;
}) => {
  return useQuery({
    queryKey: ['public-posts', params],
    queryFn: () => getPublicPosts(params),
  });
};
