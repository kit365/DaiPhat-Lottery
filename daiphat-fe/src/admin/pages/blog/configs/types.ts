export interface IBlogPost {
    id: number;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featuredImage: string;
    altImage: string;
    viewCount: number;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    category: {
        categoryId: number;
        name: string;
        slug: string;
        imageUrl: string;
        altImage: string;
        displayOrder: number;
    };
    parentId: number;
    displayOrder: number;
    metaTitle: string;
    metaDescription: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}

export interface ISelectOption {
    value: string;
    label: string;
}




