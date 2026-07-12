export interface BlogCategoryResponse {
    id: number;
    parentId?: number | null;
    parentName?: string | null;
    name: string;
    slug: string;
    description?: string | null;
    displayOrder?: number | null;
    isDeleted: boolean;
    status: string;
    avatar?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    createdBy?: string | null;
    lastModifiedBy?: string | null;
}

export interface CreateBlogCategoryRequest {
    name: string;
    parentId?: number | null;
    description?: string | null;
    status?: string;
    avatar?: string | null;
    displayOrder?: number | null;
}

export interface UpdateBlogCategoryRequest extends Partial<CreateBlogCategoryRequest> {}

import { BaseQueryParams } from "../../../../types/api.type";

export interface BlogCategoryQueryParams extends BaseQueryParams {
    keyword?: string;
    is_trash?: boolean;
    sort?: string;
}

export interface BlogCategoryMutationPayload {
    name: string;
    parent?: number | null;
    parentId?: number | null;
    description?: string | null;
    status?: string;
    avatar?: string | null;
    displayOrder?: number | null;
}
