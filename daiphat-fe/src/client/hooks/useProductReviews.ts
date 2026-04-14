import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviewsByProduct, createReview, updateReview } from '../api/review.api';

export const useProductReviews = (productId: string) => {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['product-reviews', productId],
        enabled: false, retry: false, queryFn: () => getReviewsByProduct(productId),
         
    });

    const createMutation = useMutation({
        mutationFn: createReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => updateReview(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
            queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
        }
    });

    return {
        reviews: data?.data?.reviews || [],
        avgRating: data?.data?.avgRating || 0,
        totalReviews: data?.data?.totalReviews || 0,
        isLoading,
        error,
        createReview: createMutation.mutate,
        isCreating: createMutation.isPending,
        createSuccess: createMutation.isSuccess,
        createError: createMutation.error,
        updateReview: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
        updateSuccess: updateMutation.isSuccess,
        updateError: updateMutation.error
    };
};
