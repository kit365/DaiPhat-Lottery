"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";

import { ADMIN_BADGE_POLL_MS } from "@/admin/hooks/adminBadgePoll";
import { useAdminDeferredQueries } from "@/admin/hooks/useAdminDeferredQueries";
import {
    getAdminDashboardBadges,
    type AdminDashboardBadgeCounts,
} from "@/admin/services/adminBadgeService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { isChatConversationSocketEvent } from "@/services/websocket/websocket.service";

const DEFAULT_COUNTS: AdminDashboardBadgeCounts = {
    refundPending: null,
    prizePayoutPending: null,
    supportTicketOpen: null,
    returnBatchPending: null,
    ordersPreparing: null,
    chatAttention: null,
    notificationUnread: null,
};

type AdminBadgeCountsContextValue = {
    counts: AdminDashboardBadgeCounts;
    isLoading: boolean;
    refresh: () => void;
};

const AdminBadgeCountsContext = createContext<AdminBadgeCountsContextValue>({
    counts: DEFAULT_COUNTS,
    isLoading: false,
    refresh: () => undefined,
});

export const useAdminBadgeCounts = () => useContext(AdminBadgeCountsContext);

function useAdminBadgeCountsQuery() {
    const { user, token } = useAuthStore();
    const deferred = useAdminDeferredQueries();
    const enabled = Boolean(token) && Boolean(user) && deferred;

    return useQuery({
        queryKey: [QUERY_KEYS.ADMIN_BADGES],
        queryFn: getAdminDashboardBadges,
        enabled,
        staleTime: ADMIN_BADGE_POLL_MS / 2,
        refetchOnWindowFocus: enabled,
        refetchInterval: (query) => {
            if (!enabled) {
                return false;
            }
            if (query.state.error) {
                return false;
            }
            return ADMIN_BADGE_POLL_MS;
        },
        retry: false,
    });
}

/** Subscribe to chat operator events and refresh badge counts immediately. */
function useAdminBadgeSocketRefresh(refresh: () => void) {
    const { user, token } = useAuthStore();
    const deferred = useAdminDeferredQueries();
    const { connect, socketService } = useWebSocket();

    useEffect(() => {
        if (!token || !user || !deferred) {
            return;
        }

        let cancelled = false;
        let subscription: { unsubscribe: () => void } | null = null;

        const setup = async () => {
            try {
                await connect();
                if (cancelled) {
                    return;
                }
                subscription = await socketService.subscribeOperators((payload) => {
                    if (isChatConversationSocketEvent(payload)) {
                        refresh();
                    }
                });
            } catch {
                // Poll fallback remains active.
            }
        };

        void setup();

        return () => {
            cancelled = true;
            subscription?.unsubscribe();
        };
    }, [connect, deferred, refresh, socketService, token, user]);
}

export function AdminBadgeCountsProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const query = useAdminBadgeCountsQuery();

    const refresh = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_BADGES] });
    }, [queryClient]);

    useAdminBadgeSocketRefresh(refresh);

    const value: AdminBadgeCountsContextValue = {
        counts: query.data ?? DEFAULT_COUNTS,
        isLoading: query.isLoading,
        refresh,
    };

    return (
        <AdminBadgeCountsContext.Provider value={value}>
            {children}
        </AdminBadgeCountsContext.Provider>
    );
}

export const invalidateAdminBadges = (queryClient: ReturnType<typeof useQueryClient>) =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_BADGES] });
