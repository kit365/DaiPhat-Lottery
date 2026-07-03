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
    slug?: string | null;
}

export interface UpdateBlogTagRequest extends Partial<CreateBlogTagRequest> {}
