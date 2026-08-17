"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { AppToast } from '../../../../utils/toast.util';
import { chatService } from '../services/chatService';
import {
    ADMIN_CHAT_CONVERSATIONS_KEY,
    adminChatCustomerTimelineKey,
    adminChatDetailKey,
    mergeCustomerTimelineMessage,
    useConversations,
} from './useChat';
import { Conversation, ConversationStatusEnum, MessageSenderRole, ChatConversationSocketEvent } from '../../../../types/chat.type';
import { resolveStatusAfterMessage } from '../components/utils';

import { useWebSocket } from '../../../../hooks/useWebSocket';
import {
    ChatSocketMessageEvent,
    ChatSocketMessagePayload,
    WebSocketSubscription,
} from '../../../../types/websocket.type';
import { isChatConversationSocketEvent } from '../../../../services/websocket/websocket.service';

interface UseChatSocketOptions {
    conversationId?: string | number | null;
    additionalConversationIds?: Array<string | number>;
    onMessage?: (payload: ChatSocketMessageEvent) => void;
    onConversationEvent?: (payload: ChatConversationSocketEvent) => void;
    enabled?: boolean;
}

export const useChatSocket = ({
    conversationId,
    additionalConversationIds = [],
    onMessage,
    onConversationEvent,
    enabled = true,
}: UseChatSocketOptions) => {
    const { isConnected, connect, socketService } = useWebSocket();
    const onMessageRef = useRef(onMessage);
    const onConversationEventRef = useRef(onConversationEvent);

    useEffect(() => {
        onMessageRef.current = onMessage;
        onConversationEventRef.current = onConversationEvent;
    }, [onMessage, onConversationEvent]);

    const subscriptionKey = [conversationId, ...additionalConversationIds].join(',');

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const subscriptions: WebSocketSubscription[] = [];
        let cancelled = false;

        const ids = new Set<number>();
        if (conversationId != null) {
            ids.add(Number(conversationId));
        }
        additionalConversationIds.forEach((id) => ids.add(Number(id)));

        const subscribeAll = async () => {
            try {
                await connect();
                if (cancelled) {
                    return;
                }

                await Promise.all(
                    Array.from(ids).map(async (id) => {
                        const subscription = await socketService.subscribeConversation(id, (payload) => {
                            if (isChatConversationSocketEvent(payload)) {
                                onConversationEventRef.current?.(payload);
                                return;
                            }
                            onMessageRef.current?.(payload);
                        });
                        if (cancelled) {
                            subscription.unsubscribe();
                            return;
                        }
                        subscriptions.push(subscription);
                    })
                );
            } catch {
                // Ignore
            }
        };

        void subscribeAll();

        return () => {
            cancelled = true;
            subscriptions.forEach((subscription) => subscription.unsubscribe());
        };
    }, [connect, enabled, socketService, subscriptionKey]);

    const sendMessage = useCallback(
        async (payload: Omit<ChatSocketMessagePayload, 'conversationId'>) => {
            if (conversationId == null) {
                return;
            }
            await socketService.sendChatMessage({
                ...payload,
                conversationId: Number(conversationId),
            });
        },
        [conversationId, socketService]
    );

    return { isConnected, sendMessage, connect };
};

const patchInboxConversation = (queryClient: QueryClient, event: ChatConversationSocketEvent) => {
    queryClient.setQueryData<Conversation[]>(ADMIN_CHAT_CONVERSATIONS_KEY, (prev = []) => {
        if (event.status === ConversationStatusEnum.CLOSED) {
            return prev.filter((conversation) => conversation.id !== event.conversationId);
        }
        const exists = prev.some((conversation) => conversation.id === event.conversationId);
        if (!exists) {
            return prev;
        }
        return prev.map((conversation) =>
            conversation.id === event.conversationId
                ? {
                      ...conversation,
                      status: event.status ?? conversation.status,
                      assignedOperatorId:
                          event.assignedOperatorId !== undefined
                              ? event.assignedOperatorId
                              : conversation.assignedOperatorId,
                      updatedAt: event.createdAt ?? conversation.updatedAt,
                  }
                : conversation
        );
    });
};

interface UseChatOperatorSocketOptions {
    enabled?: boolean;
    currentUserId?: string | null;
    selectedConversationId?: number | null;
    onConversationRemoved?: (conversationId: number) => void;
    onAssignedToMe?: (conversationId: number) => void;
}

export const useChatOperatorSocket = ({
    enabled = true,
    currentUserId,
    selectedConversationId,
    onConversationRemoved,
    onAssignedToMe,
}: UseChatOperatorSocketOptions = {}) => {
    const queryClient = useQueryClient();
    const { connect, socketService } = useWebSocket();
    const currentUserIdRef = useRef(currentUserId);
    const selectedIdRef = useRef(selectedConversationId);
    const onRemovedRef = useRef(onConversationRemoved);
    const onAssignedRef = useRef(onAssignedToMe);

    useEffect(() => {
        currentUserIdRef.current = currentUserId;
        selectedIdRef.current = selectedConversationId;
        onRemovedRef.current = onConversationRemoved;
        onAssignedRef.current = onAssignedToMe;
    }, [currentUserId, onAssignedToMe, onConversationRemoved, selectedConversationId]);

    const handleOperatorEvent = useCallback(
        (event: ChatConversationSocketEvent) => {
            const conversationsBeforePatch =
                queryClient.getQueryData<Conversation[]>(ADMIN_CHAT_CONVERSATIONS_KEY) ?? [];
            const cachedBeforePatch = conversationsBeforePatch.find(
                (item) => item.id === event.conversationId
            );

            const showConversationToast = (messageTemplate: (title: string) => string) => {
                const title =
                    cachedBeforePatch?.customerName
                    || cachedBeforePatch?.title
                    || null;
                if (title) {
                    AppToast.info(messageTemplate(title));
                    return;
                }
                chatService.getConversationDetail(event.conversationId)
                    .then((detail) => {
                        AppToast.info(
                            messageTemplate(
                                detail.conversation.customerName || detail.conversation.title
                            )
                        );
                    })
                    .catch(() => {
                        AppToast.info(messageTemplate(`#${event.conversationId}`));
                    });
            };

            patchInboxConversation(queryClient, event);
            queryClient.invalidateQueries({ queryKey: adminChatDetailKey(event.conversationId) });
            void queryClient.refetchQueries({ queryKey: ADMIN_CHAT_CONVERSATIONS_KEY });

            const customerId = cachedBeforePatch?.customerId;
            if (customerId) {
                queryClient.invalidateQueries({
                    queryKey: adminChatCustomerTimelineKey(customerId),
                });
            }

            if (event.eventType === 'CONVERSATION_CLOSED') {
                const currentUserId = currentUserIdRef.current;
                const wasAssignedToMe =
                    !!currentUserId
                    && (
                        cachedBeforePatch?.assignedOperatorId === currentUserId
                        || event.lastAssignedOperatorId === currentUserId
                    );
                const closedBySomeoneElse =
                    !!event.closedBy
                    && event.closedBy !== currentUserId;

                if (wasAssignedToMe && closedBySomeoneElse) {
                    showConversationToast(
                        (title) => `Hội thoại "${title}" đã được admin giải quyết.`
                    );
                }

                if (event.conversationId === selectedIdRef.current) {
                    onRemovedRef.current?.(event.conversationId);
                }
                return;
            }

            if (event.eventType === 'CONVERSATION_TAKEN') {
                if (
                    event.assignedOperatorId
                    && event.assignedOperatorId !== currentUserIdRef.current
                ) {
                    if (event.conversationId === selectedIdRef.current) {
                        onRemovedRef.current?.(event.conversationId);
                    }
                    showConversationToast((title) => `Hội thoại "${title}" đã được nhân viên khác nhận.`);
                    return;
                }
                if (
                    event.assignedOperatorId
                    && event.assignedOperatorId === currentUserIdRef.current
                    && event.conversationId !== selectedIdRef.current
                ) {
                    onAssignedRef.current?.(event.conversationId);
                    AppToast.info('Đã nhận khách tiếp theo từ hàng đợi.');
                }
                return;
            }

            if (event.eventType === 'CONVERSATION_ESCALATED') {
                showConversationToast((title) => `Hội thoại "${title}" đang chờ nhân viên nhận.`);
            }
        },
        [queryClient]
    );

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let subscription: WebSocketSubscription | null = null;
        let cancelled = false;

        connect()
            .then(async () => {
                if (cancelled) {
                    return;
                }
                subscription = await socketService.subscribeOperators(handleOperatorEvent);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            subscription?.unsubscribe();
        };
    }, [connect, enabled, handleOperatorEvent, socketService]);

    return { connect };
};

const mapInboxSocketMessage = (payload: ChatSocketMessageEvent) => ({
    id: payload.id ?? Date.now(),
    senderId: payload.senderId,
    senderType: payload.senderType || MessageSenderRole.CUSTOMER,
    conversationId: payload.conversationId,
    content: payload.content?.trim() || '',
    type: payload.type || 'TEXT',
    createdAt: payload.createdAt || new Date().toISOString(),
    isRead: false,
});

/**
 * Subscribe to every open inbox thread so a second customer's messages still
 * land while staff is looking at another conversation.
 */
export const useAdminChatInboxSocket = ({
    enabled = true,
    selectedConversationId = null,
}: {
    enabled?: boolean;
    selectedConversationId?: number | null;
} = {}) => {
    const queryClient = useQueryClient();
    const { data: conversations = [] } = useConversations();
    const selectedIdRef = useRef(selectedConversationId);

    useEffect(() => {
        selectedIdRef.current = selectedConversationId;
    }, [selectedConversationId]);

    const conversationIds = useMemo(
        () =>
            Array.from(
                new Set(
                    conversations
                        .filter((conversation) => conversation.status !== ConversationStatusEnum.CLOSED)
                        .map((conversation) => conversation.id)
                )
            ),
        [conversations]
    );

    const handleInboxMessage = useCallback(
        (payload: ChatSocketMessageEvent) => {
            const incoming = mapInboxSocketMessage(payload);
            const cached =
                queryClient.getQueryData<Conversation[]>(ADMIN_CHAT_CONVERSATIONS_KEY) ?? [];
            const match = cached.find((conversation) => conversation.id === incoming.conversationId);
            const customerId = match?.customerId;
            if (!customerId) {
                queryClient.invalidateQueries({ queryKey: ADMIN_CHAT_CONVERSATIONS_KEY });
                return;
            }

            queryClient.setQueryData(adminChatCustomerTimelineKey(customerId), (prev) =>
                mergeCustomerTimelineMessage(prev as never, incoming as never)
            );

            const selectedConversation = cached.find(
                (conversation) => conversation.id === selectedIdRef.current
            );
            const isViewingThisThread =
                selectedIdRef.current === incoming.conversationId
                || (!!selectedConversation?.customerId
                    && selectedConversation.customerId === customerId);
            queryClient.setQueryData<Conversation[]>(ADMIN_CHAT_CONVERSATIONS_KEY, (prev = []) =>
                prev.map((conversation) => {
                    if (conversation.id !== incoming.conversationId) {
                        return conversation;
                    }
                    const unreadBump =
                        incoming.senderType === MessageSenderRole.CUSTOMER && !isViewingThisThread
                            ? (conversation.unreadCount ?? 0) + 1
                            : conversation.unreadCount;
                    return {
                        ...conversation,
                        status: resolveStatusAfterMessage(conversation, incoming.senderType),
                        updatedAt: incoming.createdAt,
                        lastMessage: {
                            id: incoming.id,
                            senderId: incoming.senderId ?? '',
                            senderType: incoming.senderType,
                            conversationId: incoming.conversationId,
                            content: incoming.content,
                            type: incoming.type,
                            createdAt: incoming.createdAt,
                        },
                        unreadCount: unreadBump,
                    };
                })
            );
        },
        [queryClient]
    );

    const handleInboxConversationEvent = useCallback(
        (event: ChatConversationSocketEvent) => {
            patchInboxConversation(queryClient, event);
            void queryClient.refetchQueries({ queryKey: ADMIN_CHAT_CONVERSATIONS_KEY });
        },
        [queryClient]
    );

    useChatSocket({
        additionalConversationIds: conversationIds,
        onMessage: handleInboxMessage,
        onConversationEvent: handleInboxConversationEvent,
        enabled: enabled && conversationIds.length > 0,
    });
};

