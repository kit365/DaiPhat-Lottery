import { useQuery } from '@tanstack/react-query';
import { getPublicBlogs, getPublicBlogDetail } from '../api/blog.api';

export const useBlogs = () => {
    return useQuery({
        queryKey: ['client-blogs'],
        enabled: false,
        retry: false,
        queryFn: getPublicBlogs,
        select: (res) => res.data,
    });
};

export const useBlogDetail = (slug: string) => {
    return useQuery({
        queryKey: ['client-blog', slug],
        enabled: false,
        retry: false,
        queryFn: () => getPublicBlogDetail(slug),
        select: (res) => res.data,
    });
};
