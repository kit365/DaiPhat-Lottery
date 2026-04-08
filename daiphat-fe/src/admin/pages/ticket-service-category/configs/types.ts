export interface ITicketServiceCategory {
    _id: string;
    name: string;
    slug: string;
    description: string;
    avatar: string;
    parentId: string;
    userTicketTypes: string[];
    status: 'active' | 'inactive';
    createdAt: Date;
}

export interface ISelectOption {
    value: string;
    label: string;
}




