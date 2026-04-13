export interface Product {
    id: number;
    title: string;
    price: string;
    primaryImage: string;
    secondaryImage?: string;
    rating: number;
    isSale?: boolean;
    url: string;
}