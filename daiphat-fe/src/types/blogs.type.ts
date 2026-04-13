export interface Blog {
    _id: string;
    title: string;
    slug: string;
    featuredImage: string;
    expert?: string;
    excerpt?: string;
    description?: string;
    createdAt: string;
    publishAt?: string;
}
