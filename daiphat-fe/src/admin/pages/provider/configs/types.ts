export interface IProvider {
    providerId: number;
    name: string;
    description: string;
    logoUrl: string;
    altImage: string;
    websiteUrl: string;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string; // User data shows string "2026-01-16T..."
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
}

export interface ISelectOption {
    value: string;
    label: string;
}




