import { BlogCategoryResponse } from './blogCategory.type';
import { BlogTagResponse } from './blogTag.type';

export const BLOG_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    SCHEDULED: 'scheduled',
    UNPUBLISHED: 'unpublished'
} as const;

export type BlogStatus = typeof BLOG_STATUS[keyof typeof BLOG_STATUS];

export interface BlogPostResponse {
    id: number;
    category?: BlogCategoryResponse | null;
    type: string;
    title: string;
    slug: string;
    summary?: string | null;
    content?: string | null;
    thumbnail?: string | null;
    scheduledAt?: string | null;
    status: BlogStatus | string;
    viewCount?: number | null;
    publishedAt?: string | null;
    createdBy?: string | null;
    lastModifiedBy?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    tags?: BlogTagResponse[] | null;
    isDeleted: boolean;
}

// Alias for backwards compatibility
export interface Blog extends BlogPostResponse {}

export interface CreateBlogPostRequest {
    categoryId: number | null;
    type: string;
    title: string;
    slug: string;
    summary?: string | null;
    content?: string | null;
    thumbnail?: string | null;
    scheduledAt?: string | null;
    status: BlogStatus | string;
    tagIds?: number[] | null;
}

export interface UpdateBlogPostRequest {
    categoryId?: number | null;
    type?: string | null;
    title?: string | null;
    slug?: string | null;
    summary?: string | null;
    content?: string | null;
    thumbnail?: string | null;
    scheduledAt?: string | null;
    status?: BlogStatus | string | null;
    tagIds?: number[] | null;
}
