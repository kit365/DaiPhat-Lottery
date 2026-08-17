"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '../../../../client/services/transactionService';
import { PaymentGateway, ProcessPaymentRequest } from '../../../../types/transaction.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import { QUERY_KEYS as TICKET_QUERY_KEYS } from '../../ticket/inventory/constants/queryKeys';
import { invalidateAdminBadgeCounts } from '@/admin/utils/invalidateAdminBadgeCounts';

const invalidateCounterPaymentQueries = (
    queryClient: ReturnType<typeof useQueryClient>,
    orderId?: string
) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
    queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
    invalidateAdminBadgeCounts(queryClient);
    if (orderId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDER_DETAIL, orderId] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS, 'counter-payment-countdown', orderId] });
    }
};

export const useProcessCounterPayment = () => {
    const queryClient = useQueryClient();
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
        onSuccess: (_data, variables) => {
            invalidateCounterPaymentQueries(queryClient, variables.orderId);
        },
    });
};

export const useSyncCounterPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (orderId: string) => transactionService.syncPaymentFromGateway(orderId),
        onSuccess: (_data, orderId) => {
            invalidateCounterPaymentQueries(queryClient, orderId);
        },
    });
};

export const useCancelCounterPayment = () => {
    const queryClient = useQueryClient();
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
        onSuccess: (_data, variables) => {
            invalidateCounterPaymentQueries(queryClient, variables.orderId);
        },
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
