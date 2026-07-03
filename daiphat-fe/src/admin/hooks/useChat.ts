import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppToast as toast } from '../../utils/toast.util';
import { chatService } from '../services/chat.service';
import {
    ConversationCloseReason,
} from '../../types/chat.type';
import {
    adminChatCustomerTimelineKey,
    useCustomerChatTimeline as useCustomerChatTimelineQuery,
} from '../../hooks/useCustomerChatTimeline';
import { mergeCustomerTimelineMessage, buildTimelineInfiniteDataFromMessages } from '../../utils/chatTimeline.util';

export {
    adminChatCustomerTimelineKey,
    getCustomerChatTimelineKey,
    useMyChatTimeline,
    parseTimelineCursor,
} from '../../hooks/useCustomerChatTimeline';
export type { ChatTimelineScope, TimelineCursor } from '../../hooks/useCustomerChatTimeline';
export { mergeCustomerTimelineMessage, buildTimelineInfiniteDataFromMessages };

export const ADMIN_CHAT_CONVERSATIONS_KEY = ['admin', 'chat', 'conversations'] as const;
export const adminChatMessagesKey = (conversationId: string | number) =>
    ['admin', 'chat', 'messages', conversationId] as const;
export const adminChatDetailKey = (conversationId: string | number) =>
    ['admin', 'chat', 'detail', conversationId] as const;

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
        queryFn: () => chatService.getConversationDetail(conversationId as any).then((detail) => detail.messages),
        enabled: conversationId != null,
    });
};

export const useConversationDetail = (conversationId: string | number | null) => {
    return useQuery({
        queryKey: adminChatDetailKey(conversationId ?? 0),
        queryFn: () => chatService.getConversationDetail(conversationId as any),
        enabled: conversationId != null,
    });
};

export const useAssignConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: number) => chatService.assignToMe(conversationId),
        onSuccess: (detail, conversationId) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_CHAT_CONVERSATIONS_KEY });
            queryClient.setQueryData(adminChatDetailKey(conversationId), detail);
            const assignedCustomerId = detail.conversation?.customerId;
            if (assignedCustomerId) {
                if (detail.messages?.length) {
                    queryClient.setQueryData(
                        adminChatCustomerTimelineKey(assignedCustomerId),
                        buildTimelineInfiniteDataFromMessages(detail.messages)
                    );
                } else {
                    queryClient.invalidateQueries({
                        queryKey: adminChatCustomerTimelineKey(assignedCustomerId),
                    });
                }
            }
            toast.success('Nhận hội thoại thành công.');
        },
        onError: (error: any) => {
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
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể đóng hội thoại.');
        },
    });
};
