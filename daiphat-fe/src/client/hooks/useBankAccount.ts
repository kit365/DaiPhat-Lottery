import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bankAccountService } from '../services/bankAccountService';
import { bankCatalogService } from '../services/bankCatalogService';
import { CreateUserBankAccountRequest, UpdateUserBankAccountRequest } from '../../types/refund.type';
import { AppToast as toast } from '../../utils/toast.util';
import { QUERY_KEYS } from '../../constants/queryKeys';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error.message || fallback;

export const useGetBankAccounts = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_BANK_ACCOUNTS],
        queryFn: () => bankAccountService.getMyAccounts()
    });
};

export const useGetBanks = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_BANK_CATALOG],
        queryFn: () => bankCatalogService.getBanks(),
        staleTime: 24 * 60 * 60 * 1000
    });
};

export const useCreateBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateUserBankAccountRequest) => bankAccountService.create(data),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Thêm tài khoản ngân hàng thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_BANK_ACCOUNTS] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        }
    });
};

export const useUpdateBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateUserBankAccountRequest }) =>
            bankAccountService.update(id, data),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Cập nhật tài khoản thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_BANK_ACCOUNTS] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        }
    });
};

export const useDeleteBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => bankAccountService.delete(id),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Xóa tài khoản thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_BANK_ACCOUNTS] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        }
    });
};

export const useSetDefaultBankAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => bankAccountService.setDefault(id),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(response.message || 'Đặt tài khoản mặc định thành công');
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_BANK_ACCOUNTS] });
            } else {
                toast.error(response.message || 'Có lỗi xảy ra');
            }
        },
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Lỗi kết nối đến máy chủ'));
        }
    });
};
