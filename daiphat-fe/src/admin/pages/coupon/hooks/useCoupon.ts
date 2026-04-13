import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCoupons, createCoupon, getCouponById, updateCoupon, deleteCoupon } from '../../../api/coupon.api';

export const useCoupons = (params?: { page?: number; limit?: number; keyword?: string; status?: string }) => {
    return useQuery({
        queryKey: ['coupons', params],
        queryFn: () => getCoupons(params),
    });
};

export const useCreateCoupon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        },
    });
};

export const useUpdateCoupon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | number; data: any }) => updateCoupon(id, data),
        onSuccess: (response: any) => {
            if (response.success) {
                queryClient.invalidateQueries({ queryKey: ['coupons'] });
                queryClient.invalidateQueries({ queryKey: ['coupon'] });
            }
        },
    });
};

export const useCouponDetail = (id?: string | number) => {
    return useQuery({
        queryKey: ['coupon', id],
        queryFn: () => getCouponById(id!),
        enabled: !!id,
        select: (res: any) => {
            const data = res.data || res;
            if (data) {
                return {
                    ...data,
                    id: data._id,
                };
            }
            return null;
        },
    });
};

export const useDeleteCoupon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        },
    });
};
