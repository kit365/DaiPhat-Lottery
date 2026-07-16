import { BlogCategoryResponse } from './blog-category.type';
import { BlogTagResponse } from './blog-tag.type';

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
export type Blog = BlogPostResponse;

export interface CreateBlogPostRequest {
    categoryId: number | null;
    type: string;
    title: string;
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
    summary?: string | null;
    content?: string | null;
    thumbnail?: string | null;
    scheduledAt?: string | null;
    status?: BlogStatus | string | null;
    tagIds?: number[] | null;
}

import { BaseQueryParams } from "../../../../types/api.type";

export interface BlogQueryParams extends BaseQueryParams {
    keyword?: string;
    tagId?: Array<number | string>;
    categoryId?: Array<number | string>;
    type?: string[];
    is_trash?: boolean;
    sort?: string;
}

export interface BlogMutationPayload {
    name?: string;
    title?: string;
    description?: string;
    summary?: string;
    content?: string;
    avatar?: any;
    thumbnail?: string;
    category?: string | number[];
    categoryId?: number | null;
    status: BlogStatus | string;
    type: string;
    scheduledAt?: string | null;
    tags?: (string | number)[];
}
