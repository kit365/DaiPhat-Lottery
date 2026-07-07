import { useMutation, useQuery } from '@tanstack/react-query';
import { transactionService } from '../services/transactionService';
import { AppToast as toast } from '../../utils/toast.util';
import { CancelPaymentRequest, ProcessPaymentRequest } from '../../types/transaction.type';
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

export const useCancelPayment = () => {
    return useMutation({
        mutationFn: ({ orderId, data }: { orderId: string; data: CancelPaymentRequest }) => transactionService.cancelPayment(orderId, data),
        onError: (error: any) => {
            const message = error?.response?.data?.message || error.message || 'Không thể hủy phiên thanh toán';
            if (typeof message === 'string' && message.includes('không còn ở trạng thái chờ thanh toán')) {
                return;
            }
            toast.error(message);
        }
    });
};

export const useGetPendingPaymentCountdown = (orderId?: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PENDING_PAYMENT_COUNTDOWN, orderId],
        queryFn: () => transactionService.getPendingPaymentCountdown(orderId!),
        enabled: !!orderId,
        refetchInterval: 1000
    });
};

export const useGetTransactionTypes = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.CLIENT_TRANSACTION_TYPES],
        queryFn: () => transactionService.getTransactionTypes()
    });
};
