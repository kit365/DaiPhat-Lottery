import { useQuery } from '@tanstack/react-query';
import { getPublicBlogs, getPublicBlogDetail } from '../api/blog.api';

export const useBlogs = () => {
    return useQuery({
        queryKey: ['client-blogs'],
        queryFn: getPublicBlogs,
        select: (res) => res.data,
    });
};

export const useBlogDetail = (slug: string) => {
    return useQuery({
        queryKey: ['client-blog', slug],
        queryFn: () => getPublicBlogDetail(slug),
        enabled: !!slug,
        select: (res) => res.data,
    });
};
