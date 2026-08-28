"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { useAuthStore } from "../../stores/useAuthStore";
import { orderService } from "../services/orderService";
import { AppToast } from "../../utils/toast.util";

const ACTIVE_POLL_MS = 1_000;
const IDLE_POLL_MS = 30_000;

export const usePendingPaymentReminder = () => {
    const token = useAuthStore((state) => state.token);
    const queryClient = useQueryClient();
    const expiryHandledRef = useRef(false);

    const query = useQuery({
        queryKey: [QUERY_KEYS.CLIENT_PENDING_PAYMENT_REMINDER],
        queryFn: () => orderService.getPendingPaymentReminder(),
        enabled: !!token,
        refetchInterval: (currentQuery) => {
            const reminder = currentQuery.state.data?.data;
            if (!reminder || reminder.expired || reminder.remainingSeconds <= 0) {
                return IDLE_POLL_MS;
            }
            return ACTIVE_POLL_MS;
        },
        refetchOnWindowFocus: true,
    });

    const reminder = query.data?.data ?? null;

    const displaySeconds = useMemo(() => {
        if (!reminder?.expiresAt) {
            return Math.max(0, reminder?.remainingSeconds ?? 0);
        }
        const msLeft = new Date(reminder.expiresAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(msLeft / 1000));
    }, [reminder?.expiresAt, reminder?.remainingSeconds, query.dataUpdatedAt]);

    useEffect(() => {
        if (!reminder || reminder.expired) {
            expiryHandledRef.current = false;
            return;
        }

        if (displaySeconds > 0) {
            expiryHandledRef.current = false;
            return;
        }

        if (expiryHandledRef.current) {
            return;
        }

        expiryHandledRef.current = true;
        AppToast.error("Phiên thanh toán đã hết hạn. Đơn hàng đã bị hủy.");
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_PENDING_PAYMENT_REMINDER] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_MY_ORDERS] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_NOTIFICATIONS] });
    }, [displaySeconds, queryClient, reminder]);

    const isVisible = !!reminder && !reminder.expired && displaySeconds > 0;

    return {
        ...query,
        reminder,
        displaySeconds,
        isVisible,
    };
};
