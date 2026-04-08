export interface ITicketService {
    _id: string;
    name: string;
    slug: string;
    categoryId: string | { _id: string; name: string };
    description: string;
    duration: number;
    minDuration: number;
    maxDuration: number;
    userTicketTypes: string[];
    pricingType: 'fixed' | 'by-weight';
    basePrice?: number;
    priceList?: Array<{ label: string; value: number }>;
    status: 'active' | 'inactive';
    images?: string[];
    createdAt: Date;
}

export interface ISelectOption {
    value: string;
    label: string;
}




