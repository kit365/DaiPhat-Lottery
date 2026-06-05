import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { getPublicCategories, getPublicPosts } from '../services/blogService';

export const usePublicCategories = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.PUBLIC_BLOG_CATEGORIES],
    queryFn: getPublicCategories,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    queryKey: [QUERY_KEYS.PUBLIC_BLOG_POSTS, params],
    queryFn: () => getPublicPosts(params),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};
