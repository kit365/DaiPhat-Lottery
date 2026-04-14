import { useQuery } from '@tanstack/react-query';
import { getProducts, getProductBySlug, getCategories, getBrands } from '../api/product.api';

export const useProducts = (params: any = {}) => {
    return useQuery({
        queryKey: ['client-products', params],
        enabled: false,
        retry: false,
        queryFn: () => getProducts(params),
        select: (res) => res.data,
    });
};

export const useCategories = () => {
    return useQuery({
        queryKey: ['client-categories'],
        enabled: false,
        retry: false,
        queryFn: getCategories,
        select: (res) => res.data,
    });
}

export const useBrands = () => {
    return useQuery({
        queryKey: ['client-brands'],
        enabled: false,
        retry: false,
        queryFn: getBrands,
        select: (res) => res.data,
    });
}

export const useProductDetail = (slug: string) => {
    return useQuery({
        queryKey: ['client-product', slug],
        enabled: false,
        retry: false,
        queryFn: () => getProductBySlug(slug),
        select: (res) => res.data,
    });
};
