import { useMutation, useQuery } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { AppToast as toast } from '../utils/toast.util';
import { ProcessPaymentRequest } from '../../types/transaction.type';
import { QUERY_KEYS } from '../../constants/queryKeys';

export const useProcessPayment = () => {
    return useMutation({
        mutationFn: ({ orderId, data }: { orderId: string; data: ProcessPaymentRequest }) => transactionService.processPayment(orderId, data),
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Không thể tạo phiên thanh toán';
            toast.error(message);
        }
    });
};

export const useGetTransactionTypes = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_TRANSACTION_TYPES],
        queryFn: () => transactionService.getTransactionTypes()
    });
};
