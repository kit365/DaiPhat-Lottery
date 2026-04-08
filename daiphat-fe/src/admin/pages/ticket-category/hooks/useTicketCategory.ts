import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
    getTicketCategories, 
    createTicketCategory, 
    getNestedTicketCategories, 
    getTicketCategoryById, 
    deleteTicketCategory, 
    updateTicketCategory, 
    restoreTicketCategory, 
    forceDeleteTicketCategory 
} from '../../../api/ticket-category.api';
import { useState, useMemo } from 'react';


export const useTicketCategories = (params?: any) => {
    return useQuery({
        queryKey: ['ticket-categories', params],
        queryFn: () => getTicketCategories(params),
        placeholderData: keepPreviousData
    });
};

export const useNestedTicketCategories = () => {
    return useQuery({
        queryKey: ['ticket-categories', 'nested'],
        queryFn: getNestedTicketCategories,
        select: (res) => res.data,
    });
};

export const useCreateTicketCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTicketCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
        },
    });
};

export const useUpdateTicketCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateTicketCategory(id, data),
        onSuccess: (response) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
                queryClient.invalidateQueries({ queryKey: ['ticket-category'] });
            }
        },
    });
};

export const useTicketCategoryDetail = (id?: string | number) => {
    return useQuery({
        queryKey: ['ticket-category', id],
        queryFn: () => getTicketCategoryById(id!),
        enabled: !!id,
        select: (res: any) => res.data,
    });
};

export const useDeleteTicketCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTicketCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
        },
    });
};

export const useRestoreTicketCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreTicketCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
        },
    });
};

export const useForceDeleteTicketCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: forceDeleteTicketCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
        },
    });
};

export const useTicketCategoryData = () => {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string[]>([]);
    const [isTrash, setIsTrash] = useState(false);

    const queryParams = useMemo(() => ({
        page: page + 1,
        limit: pageSize,
        keyword: search,
        is_trash: isTrash,
        status: status.length > 0 ? status.join(',') : undefined
    }), [page, pageSize, search, isTrash, status]);

    const { data: res, isLoading } = useTicketCategories(queryParams);
    const { mutate: deleteCategory } = useDeleteTicketCategory();
    const { mutate: restoreCategory } = useRestoreTicketCategory();
    const { mutate: forceDeleteCategory } = useForceDeleteTicketCategory();

    const categories = res?.data?.recordList || [];
    const pagination = res?.data?.pagination || { totalRecords: 0, deletedCount: 0 };

    return {
        categories,
        pagination,
        isLoading,
        page,
        setPage,
        pageSize,
        setPageSize,
        search,
        setSearch,
        status,
        setStatus,
        isTrash,
        setIsTrash,
        deleteCategory,
        restoreCategory,
        forceDeleteCategory
    };
};
