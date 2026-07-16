import { useQuery, useMutation } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import { getPublicCategories, getPublicPosts, getPublicPostBySlug, getRelatedPublicPosts, incrementPostView } from '../services/blogService';

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

export const usePublicPostBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PUBLIC_BLOG_POSTS, 'detail', slug],
    queryFn: () => slug ? getPublicPostBySlug(slug) : Promise.reject('No slug'),
    enabled: !!slug,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useRelatedPublicPosts = (slug: string | undefined, limit: number = 4) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PUBLIC_BLOG_POSTS, 'related', slug],
    queryFn: () => slug ? getRelatedPublicPosts(slug, limit) : Promise.reject('No slug'),
    enabled: !!slug,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useIncrementPostView = () => {
  return useMutation({
    mutationFn: incrementPostView,
  });
};
