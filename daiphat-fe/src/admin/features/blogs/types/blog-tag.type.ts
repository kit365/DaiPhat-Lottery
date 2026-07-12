export interface BlogTagResponse {
    id: number;
    name: string;
    slug: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    createdBy?: string | null;
    lastModifiedBy?: string | null;
}

export interface CreateBlogTagRequest {
    name: string;
}

export interface UpdateBlogTagRequest extends Partial<CreateBlogTagRequest> {}

import { BaseQueryParams } from "../../../../types/api.type";

export interface BlogTagQueryParams extends BaseQueryParams {
    keyword?: string;
    is_trash?: boolean;
    sort?: string;
}
