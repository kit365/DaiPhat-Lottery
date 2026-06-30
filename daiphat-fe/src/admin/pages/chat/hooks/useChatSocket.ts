import { useCallback, useEffect } from 'react';
import { useWebSocket } from '../../../../hooks/useWebSocket';
import {
    ChatSocketMessageEvent,
    ChatSocketMessagePayload,
    WebSocketSubscription,
} from '../../../../types/websocket.type';

interface UseChatSocketOptions {
    conversationId?: number | null;
    onMessage?: (payload: ChatSocketMessageEvent) => void;
    enabled?: boolean;
}

export const useChatSocket = ({
    conversationId,
    onMessage,
    enabled = true,
}: UseChatSocketOptions) => {
    const { isConnected, connect, socketService } = useWebSocket();

    useEffect(() => {
        if (!enabled || !conversationId || !onMessage) {
            return;
        }

        let subscription: WebSocketSubscription | null = null;
        let cancelled = false;

        connect()
            .then(async () => {
                if (cancelled) {
                    return;
                }
                subscription = await socketService.subscribeConversation(conversationId, onMessage);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            subscription?.unsubscribe();
        };
    }, [connect, conversationId, enabled, onMessage, socketService]);

    const sendMessage = useCallback(
        async (payload: Omit<ChatSocketMessagePayload, 'conversationId'>) => {
            if (!conversationId) {
                throw new Error('Thiếu conversationId để gửi tin nhắn realtime.');
            }
            await socketService.sendChatMessage({
                conversationId,
                ...payload,
            });
        },
        [conversationId, socketService]
    );

    return {
        isConnected,
        connect,
        sendMessage,
    };
};
