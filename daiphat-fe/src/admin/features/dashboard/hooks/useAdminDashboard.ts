"use client";

import { useQuery } from '@tanstack/react-query';
import {
    getAdminDashboardKpis,
    getAdminDashboardDailyRevenue,
    getAdminDashboardOrderStatus,
    getAdminDashboardRecentOrders,
    getAdminDashboardSerialStatus,
    getAdminDashboardTopStations,
    getAdminDashboardActionItems,
    getAdminDashboardInventoryRisks,
    getAdminDashboardReconciliations,
} from '../services/adminDashboardService';

export const useAdminDashboardKpis = (businessDate?: string) => useQuery({
    queryKey: ['admin-dashboard', 'kpis', businessDate],
    queryFn: () => getAdminDashboardKpis({ businessDate }),
    select: (response) => response.data,
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardOrderStatus = (businessDate?: string) => useQuery({
    queryKey: ['admin-dashboard', 'order-status', businessDate],
    queryFn: () => getAdminDashboardOrderStatus({ businessDate }),
    select: (response) => response.data ?? [],
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardSerialStatus = (businessDate?: string) => useQuery({
    queryKey: ['admin-dashboard', 'serial-status', businessDate],
    queryFn: () => getAdminDashboardSerialStatus({ businessDate }),
    select: (response) => response.data ?? [],
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardTopStations = (
    fromDate?: string,
    toDate?: string,
    limit = 5,
    enabled = true,
) => useQuery({
    queryKey: ['admin-dashboard', 'top-stations', fromDate, toDate, limit],
    queryFn: () => getAdminDashboardTopStations({ fromDate, toDate, limit }),
    select: (response) => response.data ?? [],
    enabled: enabled && Boolean(fromDate && toDate),
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardRecentOrders = (businessDate?: string, limit = 6) => useQuery({
    queryKey: ['admin-dashboard', 'recent-orders', businessDate, limit],
    queryFn: () => getAdminDashboardRecentOrders({ businessDate, limit }),
    select: (response) => response.data ?? [],
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardDailyRevenue = (businessDate?: string, enabled = true) => useQuery({
    queryKey: ['admin-dashboard', 'daily-revenue', businessDate],
    queryFn: () => getAdminDashboardDailyRevenue({ businessDate }),
    select: (response) => response.data ?? [],
    enabled,
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardActionItems = (businessDate?: string, enabled = true) => useQuery({
    queryKey: ['admin-dashboard', 'action-items', businessDate],
    queryFn: () => getAdminDashboardActionItems({ businessDate }),
    select: (response) => response.data ?? [],
    enabled,
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardInventoryRisks = (businessDate?: string) => useQuery({
    queryKey: ['admin-dashboard', 'inventory-risks', businessDate],
    queryFn: () => getAdminDashboardInventoryRisks({ businessDate }),
    select: (response) => response.data ?? [],
    retry: 1,
    staleTime: 30_000,
});

export const useAdminDashboardReconciliations = (businessDate?: string, limit = 5, enabled = true) => useQuery({
    queryKey: ['admin-dashboard', 'reconciliations', businessDate, limit],
    queryFn: () => getAdminDashboardReconciliations({ businessDate, limit }),
    select: (response) => response.data ?? [],
    enabled,
    retry: 1,
    staleTime: 30_000,
});

/** Backward-compatible hook shape for the dashboard page. */
export const useAdminDashboard = (businessDate?: string, options?: {
    includeActionItems?: boolean;
    includeDailyRevenue?: boolean;
    includeReconciliations?: boolean;
    topStationsFromDate?: string;
    topStationsToDate?: string;
    topStationsEnabled?: boolean;
}) => ({
    kpis: useAdminDashboardKpis(businessDate),
    serialStatus: useAdminDashboardSerialStatus(businessDate),
    topStations: useAdminDashboardTopStations(
        options?.topStationsFromDate ?? businessDate,
        options?.topStationsToDate ?? businessDate,
        5,
        options?.topStationsEnabled ?? true,
    ),
    recentOrders: useAdminDashboardRecentOrders(businessDate),
    dailyRevenue: useAdminDashboardDailyRevenue(businessDate, options?.includeDailyRevenue ?? true),
    actionItems: useAdminDashboardActionItems(businessDate, options?.includeActionItems ?? true),
    reconciliations: useAdminDashboardReconciliations(businessDate, 5, options?.includeReconciliations ?? true),
});
