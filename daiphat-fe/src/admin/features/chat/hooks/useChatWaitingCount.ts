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
import { getManagementUnreadCount } from '../components/utils';

/**
 * Polls chat conversations for the sidebar badge.
 * Badge = conversations waiting for staff OR having unread customer messages.
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
