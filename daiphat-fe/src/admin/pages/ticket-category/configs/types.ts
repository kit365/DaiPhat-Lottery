export interface ITicketCategory {
    categoryId: number;
    name: string;
    imageUrl: string;
    parentName: string;
    view: number;
    createdAt: Date;
    isActive: boolean;
}

export interface ISelectOption {
    value: string;
    label: string;
}



