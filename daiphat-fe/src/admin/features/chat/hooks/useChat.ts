"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppToast as toast } from '../../../../utils/toast.util';
import { chatService, mapConversation, mapMessage } from '../services/chatService';
import { Conversation, ConversationCloseReason } from '../../../../types/chat.type';
import {
    adminChatCustomerTimelineKey,
    useCustomerChatTimeline as useCustomerChatTimelineQuery,
} from '../../../../hooks/useCustomerChatTimeline';
import { mergeCustomerTimelineMessage, buildTimelineInfiniteDataFromMessages } from '../../../../utils/chatTimeline.util';
import {
    ADMIN_CHAT_AI_CONFIG_KEY,
    ADMIN_CHAT_CONVERSATIONS_KEY,
    adminChatDetailKey,
    adminChatMessagesKey,
} from '../constants/queryKeys';
import { AiServiceConfig } from '../types/chat.type';

export {
    adminChatCustomerTimelineKey,
    getCustomerChatTimelineKey,
    useMyChatTimeline,
    parseTimelineCursor,
} from '../../../../hooks/useCustomerChatTimeline';
export type { ChatTimelineScope, TimelineCursor } from '../../../../hooks/useCustomerChatTimeline';
export { mergeCustomerTimelineMessage, buildTimelineInfiniteDataFromMessages };
export { ADMIN_CHAT_CONVERSATIONS_KEY, adminChatDetailKey, adminChatMessagesKey };

export const useAiServiceConfig = () =>
    useQuery({
        queryKey: ADMIN_CHAT_AI_CONFIG_KEY,
        queryFn: chatService.getAiConfig,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    });

export const useUpdateAiServiceStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: chatService.updateAiStatus,
        onSuccess: (config: AiServiceConfig) => {
            queryClient.setQueryData(ADMIN_CHAT_AI_CONFIG_KEY, config);
            toast.success(config.enabled ? 'Đã bật trợ lý AI.' : 'Đã tắt trợ lý AI.');
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || 'Không thể cập nhật trạng thái trợ lý AI.');
        },
    });
};

export const useCustomerChatTimeline = (customerId: string | null | undefined) =>
    useCustomerChatTimelineQuery('admin', customerId);

export const useConversations = () => {
    return useQuery({
        queryKey: ADMIN_CHAT_CONVERSATIONS_KEY,
        queryFn: chatService.getConversations,
    });
};

export const useMessages = (conversationId: string | number | null) => {
    return useQuery({
        queryKey: adminChatMessagesKey(conversationId ?? 0),
        queryFn: () => chatService.getConversationDetail(conversationId as number).then((detail) => detail.messages),
        enabled: conversationId != null,
    });
};

export const useConversationDetail = (conversationId: string | number | null) => {
    return useQuery({
        queryKey: adminChatDetailKey(conversationId ?? 0),
        queryFn: () => chatService.getConversationDetail(conversationId as number),
        enabled: conversationId != null,
    });
};

export const useAssignConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: number) => chatService.assignToMe(conversationId),
        onSuccess: (detail, conversationId) => {
            const conversation = mapConversation(detail.conversation);
            const messages = (detail.messages ?? [])
                .filter((message) => message.type === 'TEXT' || message.type === 'SYSTEM')
                .map(mapMessage);

            // ChatWindow reads canReply/canClaim from the conversations list — patch it
            // immediately from the assign response so the input unlocks without waiting
            // on a refetch that can race with pre-commit websocket events.
            queryClient.setQueryData<Conversation[]>(ADMIN_CHAT_CONVERSATIONS_KEY, (prev = []) => {
                const exists = prev.some((item) => item.id === conversationId);
                if (!exists) {
                    return [conversation, ...prev];
                }
                return prev.map((item) =>
                    item.id === conversationId
                        ? {
                              ...item,
                              ...conversation,
                              lastMessage: item.lastMessage,
                              unreadCount: item.unreadCount,
                          }
                        : item
                );
            });

            queryClient.setQueryData(adminChatDetailKey(conversationId), {
                conversation,
                messages,
            });

            const assignedCustomerId = conversation.customerId;
            if (assignedCustomerId) {
                if (messages.length) {
                    queryClient.setQueryData(
                        adminChatCustomerTimelineKey(assignedCustomerId),
                        buildTimelineInfiniteDataFromMessages(messages)
                    );
                } else {
                    queryClient.invalidateQueries({
                        queryKey: adminChatCustomerTimelineKey(assignedCustomerId),
                    });
                }
            }
            toast.success('Nhận hội thoại thành công.');
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || 'Không thể nhận hội thoại.');
        },
    });
};

export const useCloseConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            conversationId,
            reason,
        }: {
            conversationId: number;
            reason: ConversationCloseReason;
        }) => chatService.close(conversationId, reason),
        onSuccess: (detail, { conversationId }) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_CHAT_CONVERSATIONS_KEY });
            queryClient.setQueryData(adminChatDetailKey(conversationId), detail);
            const customerId = detail.conversation?.customerId;
            if (customerId) {
                queryClient.invalidateQueries({ queryKey: adminChatCustomerTimelineKey(customerId) });
            }
            toast.success('Đóng hội thoại thành công.');
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || 'Không thể đóng hội thoại.');
        },
    });
};
