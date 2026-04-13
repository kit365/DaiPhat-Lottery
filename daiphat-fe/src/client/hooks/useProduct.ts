import { useQuery } from '@tanstack/react-query';
import { getProducts, getProductBySlug, getCategories, getBrands } from '../api/product.api';

export const useProducts = (params: any = {}) => {
    return useQuery({
        queryKey: ['client-products', params],
        queryFn: () => getProducts(params),
        select: (res) => res.data,
    });
};

export const useCategories = () => {
    return useQuery({
        queryKey: ['client-categories'],
        queryFn: getCategories,
        select: (res) => res.data,
    });
}

export const useBrands = () => {
    return useQuery({
        queryKey: ['client-brands'],
        queryFn: getBrands,
        select: (res) => res.data,
    });
}

export const useProductDetail = (slug: string) => {
    return useQuery({
        queryKey: ['client-product', slug],
        queryFn: () => getProductBySlug(slug),
        enabled: !!slug,
        select: (res) => res.data,
    });
};
