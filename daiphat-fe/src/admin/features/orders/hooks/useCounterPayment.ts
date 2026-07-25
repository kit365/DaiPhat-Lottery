import { useMutation, useQuery } from '@tanstack/react-query';
import { transactionService } from '../../../../client/services/transactionService';
import { PaymentGateway, ProcessPaymentRequest } from '../../../../types/transaction.type';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useProcessCounterPayment = () => {
    return useMutation({
        mutationFn: ({
            orderId,
            transactionId,
        }: {
            orderId: string;
            transactionId: number;
        }) =>
            transactionService.processPayment(orderId, {
                transactionId,
                gateway: PaymentGateway.PAYOS,
            } satisfies ProcessPaymentRequest),
    });
};

export const useSyncCounterPayment = () => {
    return useMutation({
        mutationFn: (orderId: string) => transactionService.syncPaymentFromGateway(orderId),
    });
};

export const useCancelCounterPayment = () => {
    return useMutation({
        mutationFn: ({
            orderId,
            transactionId,
        }: {
            orderId: string;
            transactionId: number;
        }) =>
            transactionService.cancelPayment(orderId, {
                transactionId,
                gateway: PaymentGateway.PAYOS,
                reason: 'Huỷ phiên thanh toán tại quầy',
            }),
    });
};

export const useCounterPaymentCountdown = (orderId?: string, enabled = false) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ORDERS, 'counter-payment-countdown', orderId],
        queryFn: () => transactionService.getPendingPaymentCountdown(orderId!),
        enabled: !!orderId && enabled,
        refetchInterval: 1000,
    });
};
