import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
    getOrders,
    getOrderDetail,
    updateOrderStatus,
    createOrder,
} from "../services/orderService";
import { OrderFilterParams } from '../../../../types/order.type';
import { QUERY_KEYS } from '../constants/queryKeys';
import { QUERY_KEYS as GLOBAL_QUERY_KEYS } from '../../../../constants/queryKeys';
import { QUERY_KEYS as TICKET_QUERY_KEYS } from '../../ticket/inventory/constants/queryKeys';
import { getSystemConfigs } from '../../system-config/services/systemConfigService';
import { ConfigType } from '../../system-config/types/system-config';
import { SYSTEM_CONFIG_KEYS } from '../../system-config/hooks/useSystemConfig';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';

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
            queryClient.invalidateQueries({ queryKey: [GLOBAL_QUERY_KEYS.ADMIN_NOTIFICATIONS] });
        },
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

/** Polls statusCounts for the sidebar PREPARING badge. */
export const usePreparingOrderCount = () => {
    const { user } = useAuthStore();
    const canView = hasPermission(user, PERMISSIONS.ORDER.VIEW);

    const query = useQuery({
        queryKey: [GLOBAL_QUERY_KEYS.ADMIN_ORDERS, 'preparing-count'],
        queryFn: () => getOrders({ page: 1, size: 1 }),
        enabled: canView,
        refetchOnWindowFocus: true,
        refetchInterval: 5_000,
        staleTime: 0,
    });

    const preparingCount = useMemo(() => {
        const counts = query.data?.data?.statusCounts as Record<string, number> | undefined;
        return Number(counts?.PREPARING) || 0;
    }, [query.data?.data?.statusCounts]);

    return {
        preparingCount,
        isLoading: query.isLoading,
    };
};

/** Matches backend `VENDOR_RETURN_CUTOFF` default (giờ chốt trả vé / draw ops cutoff). */
export const DEFAULT_ORDER_DRAW_CUTOFF = '15:00';
export const ORDER_DRAW_CUTOFF_CONFIG_KEY = 'VENDOR_RETURN_CUTOFF';
const APPROACHING_WINDOW_MINUTES = 60;

export type OrderCutoffPhase = 'none' | 'approaching' | 'past';

export const parseCutoffTime = (cutoffTime?: string | null): { hour: number; minute: number } | null => {
    if (!cutoffTime?.trim()) return null;
    const [hourPart, minutePart] = cutoffTime.trim().split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart ?? 0);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
};

export const resolveCutoffMoment = (cutoffTime: string, now: Dayjs = dayjs()): Dayjs | null => {
    const parsed = parseCutoffTime(cutoffTime);
    if (!parsed) return null;
    return now.hour(parsed.hour).minute(parsed.minute).second(0).millisecond(0);
};

export const resolveOrderCutoffPhase = (
    cutoffTime: string,
    now: Dayjs = dayjs(),
    approachingWindowMinutes = APPROACHING_WINDOW_MINUTES
): OrderCutoffPhase => {
    const cutoff = resolveCutoffMoment(cutoffTime, now);
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

/** Draw/vendor-return cutoff + whether PREPARING orders need attention. */
export const useOrderDrawCutoff = (preparingCount = 0) => {
    const { user } = useAuthStore();
    const canViewSettings = hasPermission(user, PERMISSIONS.SETTINGS.VIEW);
    const [now, setNow] = useState(() => dayjs());

    useEffect(() => {
        const tick = window.setInterval(() => setNow(dayjs()), 30_000);
        return () => window.clearInterval(tick);
    }, []);

    const configQuery = useQuery({
        queryKey: SYSTEM_CONFIG_KEYS.list(ConfigType.ORDER_SETTING),
        queryFn: () => getSystemConfigs(ConfigType.ORDER_SETTING),
        enabled: canViewSettings,
        staleTime: 60_000,
        retry: false,
    });

    const cutoffTime = useMemo(() => {
        const configs = configQuery.data?.data ?? [];
        const match = configs.find((c) => c.configKey === ORDER_DRAW_CUTOFF_CONFIG_KEY);
        return parseCutoffTime(match?.configValue) ? match!.configValue : DEFAULT_ORDER_DRAW_CUTOFF;
    }, [configQuery.data?.data]);

    const phase = useMemo(
        () => resolveOrderCutoffPhase(cutoffTime, now),
        [cutoffTime, now]
    );

    const cutoffMoment = useMemo(
        () => resolveCutoffMoment(cutoffTime, now),
        [cutoffTime, now]
    );

    const shouldHighlightPreparing =
        phase === 'approaching' || (phase === 'past' && preparingCount > 0);

    const showReminderBanner =
        phase === 'approaching' || (phase === 'past' && preparingCount > 0);

    return {
        cutoffTime,
        cutoffLabel: cutoffMoment?.format('HH:mm') ?? cutoffTime,
        phase,
        shouldHighlightPreparing,
        showReminderBanner,
        preparingCount,
        now,
    };
};
