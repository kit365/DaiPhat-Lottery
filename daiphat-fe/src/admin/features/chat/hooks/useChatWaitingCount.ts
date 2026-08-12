"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatService } from '../services/chatService';
import { ADMIN_CHAT_CONVERSATIONS_KEY } from '../constants/queryKeys';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { hasPermission } from '../../../utils/permission.util';
import { PERMISSIONS } from '../../../constants/permission.constants';
import { ConversationStatusEnum } from '../../../../types/chat.type';
import { getManagementUnreadCount } from '../components/utils';
import { ADMIN_BADGE_POLL_MS } from '../../../hooks/adminBadgePoll';
import { useAdminDeferredQueries } from '../../../hooks/useAdminDeferredQueries';

/**
 * Polls chat conversations for the sidebar badge (no websocket — keeps shell light).
 */
export const useChatWaitingCount = () => {
    const { user } = useAuthStore();
    const deferred = useAdminDeferredQueries();
    const canView = hasPermission(user, PERMISSIONS.CHAT.VIEW);

    const query = useQuery({
        queryKey: [...ADMIN_CHAT_CONVERSATIONS_KEY, 'waiting-count'] as const,
        queryFn: chatService.getConversations,
        enabled: canView && deferred,
        refetchOnWindowFocus: canView && deferred,
        refetchInterval: (q) => {
            if (!canView || !deferred) return false;
            if (q.state.error) return false;
            return ADMIN_BADGE_POLL_MS;
        },
        staleTime: ADMIN_BADGE_POLL_MS / 2,
    });

    const conversations = query.data ?? [];

    const waitingCount = useMemo(
        () =>
            conversations.filter(
                (conversation) => conversation.status === ConversationStatusEnum.WAITING_FOR_OPERATOR
            ).length,
        [conversations]
    );

    const badgeCount = useMemo(
        () =>
            conversations.filter(
                (conversation) =>
                    conversation.status === ConversationStatusEnum.WAITING_FOR_OPERATOR ||
                    getManagementUnreadCount(conversation) > 0
            ).length,
        [conversations]
    );

    return {
        waitingCount,
        badgeCount,
        isLoading: query.isLoading,
    };
};
