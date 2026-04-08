export interface IBlogCategory {
    _id: string;
    name: string;
    avatar: string;
    slug: string;
    parent: string | null;
    description?: string;
    view?: number;
    createdAt?: string | Date;
    status: 'active' | 'inactive';
}

export interface ISelectOption {
    value: string;
    label: string;
}




