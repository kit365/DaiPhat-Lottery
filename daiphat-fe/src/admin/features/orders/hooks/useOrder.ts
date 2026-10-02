"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
    getOrders,
    getOrderDetail,
    updateOrderStatus,
    createOrder,
    uploadOrderHandoverEvidence,
    confirmOrderHandover,
    reviewPaymentTimeoutComplaint,
    getPendingPaymentTimeoutComplaintCount,
} from "../services/orderService";
import { OrderFilterParams, OrderResponse, OrderStatus } from '../../../../types/order.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import { QUERY_KEYS as TICKET_QUERY_KEYS } from '../../ticket/inventory/constants/queryKeys';
import { QUERY_KEYS as NOTIFICATION_QUERY_KEYS } from '../../notifications/constants/queryKeys';
import { QUERY_KEYS as REFUND_QUERY_KEYS } from '../../refund/constants/queryKeys';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { ADMIN_BADGE_POLL_MS } from '../../../hooks/adminBadgePoll';
import { useAdminDeferredQueries } from '../../../hooks/useAdminDeferredQueries';
import { refundAdminApi } from '../../refund/services/refundService';
import { QUERY_STALE_TIMES } from '@/shared/react-query';
import type { ConfirmOrderHandoverRequest } from '../types/order.type';

type AdminOrderListFilters = OrderFilterParams & { limit?: number };

export const useAdminOrderList = (initialParams?: OrderFilterParams) => {
    const [filters, setFilters] = useState<AdminOrderListFilters>({
        page: 1,
        limit: 10,
        size: 10,
        ...initialParams,
    });

    const queryInfo = useQuery({
        queryKey: [QUERY_KEYS.ORDERS, filters],
        queryFn: () => getOrders(filters),
        placeholderData: keepPreviousData,
    });

    const setFilter = (fieldId: string, values: string[]) => {
        setFilters((prev) => {
            const newFilters = { ...prev, page: 1 };

            switch (fieldId) {
                case 'status':
                    newFilters.status = values.length > 0 ? values : undefined;
                    break;
                case 'orderType':
                    newFilters.orderType = values.length > 0 ? values : undefined;
                    break;
                case 'receiveType':
                    newFilters.receiveType = values.length > 0 ? values : undefined;
                    break;
                case 'dateRange': {
                    if (!values.length) {
                        newFilters.fromDate = undefined;
                        newFilters.toDate = undefined;
                        break;
                    }

                    const monthRange = values.find((v) => v.startsWith('month:'));
                    if (monthRange) {
                        const [, from, to] = monthRange.split(':');
                        newFilters.fromDate = from;
                        newFilters.toDate = to;
                        break;
                    }

                    const sorted = [...values].filter((v) => !v.startsWith('month:')).sort();
                    if (sorted.length === 0) {
                        newFilters.fromDate = undefined;
                        newFilters.toDate = undefined;
                    } else {
                        newFilters.fromDate = sorted[0];
                        newFilters.toDate = sorted[sorted.length - 1];
                    }
                    break;
                }
            }
            return newFilters;
        });
    };

    const clearFilters = () => {
        const limit = filters.limit ?? filters.size ?? 10;
        setFilters({ page: 1, limit, size: limit });
    };

    const setSortBy = (sortByUI: string) => {
        setFilters((prev) => {
            const newFilters = { ...prev, page: 1 };
            if (sortByUI === 'default' || sortByUI === 'newest') {
                newFilters.sortBy = 'createdAt';
                newFilters.direction = 'DESC';
            } else if (sortByUI === 'pickup_asc') {
                newFilters.sortBy = 'expectedPickupAt';
                newFilters.direction = 'ASC';
            } else if (sortByUI === 'price_desc') {
                newFilters.sortBy = 'totalAmount';
                newFilters.direction = 'DESC';
            } else if (sortByUI === 'price_asc') {
                newFilters.sortBy = 'totalAmount';
                newFilters.direction = 'ASC';
            }
            return newFilters;
        });
    };

    const setSearchFilter = (search: string) => {
        setFilters((prev) => ({ ...prev, search, page: 1 }));
    };

    const setPage = (page: number) => {
        setFilters((prev) => ({ ...prev, page }));
    };

    const setLimit = (limit: number) => {
        setFilters((prev) => ({ ...prev, limit, size: limit, page: 1 }));
    };

    let sortByUI = 'default';
    if (filters.sortBy === 'createdAt' && filters.direction === 'DESC') sortByUI = 'newest';
    else if (filters.sortBy === 'expectedPickupAt' && filters.direction === 'ASC') sortByUI = 'pickup_asc';
    else if (filters.sortBy === 'totalAmount' && filters.direction === 'DESC') sortByUI = 'price_desc';
    else if (filters.sortBy === 'totalAmount' && filters.direction === 'ASC') sortByUI = 'price_asc';

    return {
        orders: queryInfo.data?.data?.recordList || [],
        pagination: queryInfo.data?.data?.pagination,
        statusCounts: queryInfo.data?.data?.statusCounts,
        isLoading: queryInfo.isLoading,
        error: queryInfo.error,
        filters,
        sortByUI,
        setFilter,
        clearFilters,
        setSearchFilter,
        setSortBy,
        setPage,
        setLimit,
        refetch: queryInfo.refetch,
    };
};

export const useOrderDetail = (id: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.ORDER_DETAIL, id],
        queryFn: () => getOrderDetail(id),
        enabled: !!id,
    });
};

export const useUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
            updateOrderStatus(id, status, reason),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDER_DETAIL, variables.id] });
            queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEYS.NOTIFICATIONS] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKET_DETAIL] });
        },
    });
};

export const useUploadOrderHandoverEvidence = () => {
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => uploadOrderHandoverEvidence(id, file),
    });
};

export const useConfirmOrderHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: ConfirmOrderHandoverRequest }) =>
            confirmOrderHandover(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDER_DETAIL, variables.id] });
            queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEYS.NOTIFICATIONS] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKET_DETAIL] });
        },
    });
};

export const useReviewPaymentTimeoutComplaint = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) =>
            reviewPaymentTimeoutComplaint(id, { approved, reason }),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDER_DETAIL, variables.id] });
            queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEYS.NOTIFICATIONS] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKET_DETAIL] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS, 'payment-timeout-complaints-count'] });
        },
    });
};

export const usePendingPaymentTimeoutComplaintCount = () => {
    const { user, token } = useAuthStore();
    const deferred = useAdminDeferredQueries();
    const canView = Boolean(token) && Boolean(user) && hasPermission(user, PERMISSIONS.ORDER.VIEW);

    return useQuery({
        queryKey: [QUERY_KEYS.ORDERS, 'payment-timeout-complaints-count'],
        queryFn: getPendingPaymentTimeoutComplaintCount,
        enabled: canView && deferred,
        refetchOnWindowFocus: canView && deferred,
        refetchInterval: (query) => {
            if (!canView || !deferred || query.state.error) return false;
            return ADMIN_BADGE_POLL_MS;
        },
        staleTime: ADMIN_BADGE_POLL_MS / 2,
        retry: false,
    });
};

export const useCreateOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: unknown) => createOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] });
            queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_KEYS.TICKETS] });
        },
    });
};

/** Polls PREPARING statusCounts for sidebar badges, split by order type. */
export const usePreparingOrderCount = () => {
    const { user, token } = useAuthStore();
    const deferred = useAdminDeferredQueries();
    const canView = Boolean(token) && Boolean(user) && hasPermission(user, PERMISSIONS.ORDER.VIEW);

    const onlineQuery = useQuery({
        queryKey: [QUERY_KEYS.ORDERS, 'preparing-count', 'ONLINE'],
        queryFn: () => getOrders(
            { page: 1, size: 1, orderType: 'ONLINE' },
            { skipGlobalErrorToast: true }
        ),
        enabled: canView && deferred,
        refetchOnWindowFocus: canView && deferred,
        refetchInterval: (q) => {
            if (!canView || !deferred) return false;
            if (q.state.error) return false;
            return ADMIN_BADGE_POLL_MS;
        },
        staleTime: ADMIN_BADGE_POLL_MS / 2,
        retry: false,
    });

    const directQuery = useQuery({
        queryKey: [QUERY_KEYS.ORDERS, 'preparing-count', 'DIRECT'],
        queryFn: () => getOrders(
            { page: 1, size: 1, orderType: 'DIRECT' },
            { skipGlobalErrorToast: true }
        ),
        enabled: canView && deferred,
        refetchOnWindowFocus: canView && deferred,
        refetchInterval: (q) => {
            if (!canView || !deferred) return false;
            if (q.state.error) return false;
            return 30_000;
        },
        staleTime: 15_000,
        retry: false,
    });

    const onlinePreparingCount = useMemo(() => {
        const counts = onlineQuery.data?.data?.statusCounts as Record<string, number> | undefined;
        return Number(counts?.PREPARING) || 0;
    }, [onlineQuery.data?.data?.statusCounts]);

    const directPreparingCount = useMemo(() => {
        const counts = directQuery.data?.data?.statusCounts as Record<string, number> | undefined;
        return Number(counts?.PREPARING) || 0;
    }, [directQuery.data?.data?.statusCounts]);

    const preparingCount = onlinePreparingCount + directPreparingCount;

    return {
        /** ONLINE PREPARING — badge for "Danh sách đơn". */
        onlinePreparingCount,
        /** DIRECT PREPARING — badge for "Tạo đơn tại quầy". */
        directPreparingCount,
        /** Combined total for parent "Đơn hàng". */
        preparingCount,
        isLoading: onlineQuery.isLoading || directQuery.isLoading,
    };
};

const APPROACHING_WINDOW_MINUTES = 60;

export type OrderCutoffPhase = 'none' | 'approaching' | 'past';

export const resolveCutoffMoment = (cutoffAt?: string | null): Dayjs | null => {
    if (!cutoffAt) return null;
    const parsed = dayjs(cutoffAt);
    return parsed.isValid() ? parsed : null;
};

export const resolveOrderCutoffPhase = (
    cutoffAt?: string | null,
    now: Dayjs = dayjs(),
    approachingWindowMinutes = APPROACHING_WINDOW_MINUTES
): OrderCutoffPhase => {
    const cutoff = resolveCutoffMoment(cutoffAt);
    if (!cutoff) return 'none';

    if (!now.isBefore(cutoff)) {
        return 'past';
    }

    const approachingStart = cutoff.subtract(approachingWindowMinutes, 'minute');
    if (!now.isBefore(approachingStart)) {
        return 'approaching';
    }

    return 'none';
};

/** Supplier-derived order cutoffs returned by the backend. */
export const useOrderDrawCutoff = (
    orders: Pick<OrderResponse, 'id' | 'status' | 'preparationCutoffAt'>[],
    preparingCount = 0,
    onCutoffReached?: () => void | Promise<unknown>,
) => {
    const [now, setNow] = useState(() => dayjs());
    const refreshedCutoffRef = useRef<string | null>(null);

    useEffect(() => {
        const tick = window.setInterval(() => setNow(dayjs()), 30_000);
        return () => window.clearInterval(tick);
    }, []);

    const preparingCutoffs = useMemo(() => orders
        .filter((order) => order.status === OrderStatus.PREPARING)
        .map((order) => ({ orderId: order.id, cutoff: resolveCutoffMoment(order.preparationCutoffAt) }))
        .filter((item): item is { orderId: string; cutoff: Dayjs } => item.cutoff !== null), [orders]);

    const cutoffMoment = useMemo(() => preparingCutoffs
        .map((item) => item.cutoff)
        .sort((a, b) => a.valueOf() - b.valueOf())[0] ?? null, [preparingCutoffs]);

    const phase = useMemo(
        () => resolveOrderCutoffPhase(cutoffMoment?.toISOString(), now),
        [cutoffMoment, now]
    );

    const urgentOrderIds = useMemo(() => new Set(preparingCutoffs
        .filter(({ cutoff }) => {
            const approachingAt = cutoff.subtract(APPROACHING_WINDOW_MINUTES, 'minute');
            return !now.isBefore(approachingAt);
        })
        .map(({ orderId }) => orderId)), [preparingCutoffs, now]);

    useEffect(() => {
        const cutoffKey = cutoffMoment?.toISOString() ?? null;
        if (phase !== 'past' || !cutoffKey || !onCutoffReached) return;
        if (refreshedCutoffRef.current === cutoffKey) return;
        refreshedCutoffRef.current = cutoffKey;
        void onCutoffReached();
    }, [cutoffMoment, onCutoffReached, phase]);

    const shouldHighlightPreparing =
        preparingCount > 0 && (phase === 'approaching' || phase === 'past');

    const showReminderBanner =
        phase === 'approaching' || (phase === 'past' && preparingCount > 0);

    return {
        cutoffLabel: cutoffMoment?.format('HH:mm') ?? '—',
        phase,
        shouldHighlightPreparing,
        showReminderBanner,
        urgentOrderIds,
        preparingCount,
        now,
    };
};

export const useOrderRefundsForInspection = (orderId?: string, enabled = false) => {
    return useQuery({
        queryKey: [REFUND_QUERY_KEYS.ADMIN_REFUNDS, { orderId, page: 1, limit: 20 }],
        queryFn: () => refundAdminApi.getStaffRefunds({ orderId, page: 1, limit: 20 }),
        enabled: !!orderId && enabled,
        staleTime: QUERY_STALE_TIMES.badge,
    });
};
