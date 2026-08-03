"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatService } from '../services/chatService';
import { ADMIN_CHAT_CONVERSATIONS_KEY } from '../constants/queryKeys';
import { useChatOperatorSocket } from './useChatSocket';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { ConversationStatusEnum } from '../../../../types/chat.type';

/**
 * Polls waiting-for-staff count for the sidebar badge.
 * Uses a dedicated query key so the 5s poll does not constantly
 * re-render the open chat page / handoff summary.
 */
export const useChatWaitingCount = () => {
    const { user } = useAuthStore();
    const canView = hasPermission(user, PERMISSIONS.CHAT.VIEW);
    const userId = user?.id;

    useChatOperatorSocket({
        enabled: canView,
        currentUserId: userId,
    });

    const query = useQuery({
        queryKey: [...ADMIN_CHAT_CONVERSATIONS_KEY, 'waiting-count'] as const,
        queryFn: chatService.getConversations,
        enabled: canView,
        refetchOnWindowFocus: true,
        refetchInterval: 15_000,
        staleTime: 10_000,
    });

    const waitingCount = useMemo(
        () =>
            (query.data ?? []).filter(
                (conversation) => conversation.status === ConversationStatusEnum.WAITING_FOR_OPERATOR
            ).length,
        [query.data]
    );

    return {
        waitingCount,
        isLoading: query.isLoading,
    };
};
