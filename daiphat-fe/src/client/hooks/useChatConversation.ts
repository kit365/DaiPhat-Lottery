import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatConversationService } from '../services/chatConversationService';
import { AppToast as toast } from '../../utils/toast.util';
import {
    InitConversationRequest,
    ConversationDetailResponse,
    EscalationReason,
} from '../../types/chat.type';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ChatSocketMessageEvent } from '../../types/websocket.type';
import { ChatConversationSocketEvent } from '../../types/chat.type';
import { isChatConversationSocketEvent } from '../../services/websocket/websocket.service';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.message || fallback;

export const useChatConversation = () => {
    const { connect, socketService } = useWebSocket();
    const [isLoadingOpen, setIsLoadingOpen] = useState(false);

    const initMutation = useMutation({
        mutationFn: (data: InitConversationRequest) => chatConversationService.init(data),
        onError: (error: any) => {
            toast.error(getErrorMessage(error, 'Không thể khởi tạo cuộc trò chuyện.'));
        },
    });

    const initConversation = async (data: InitConversationRequest): Promise<ConversationDetailResponse | null> => {
        const response = await initMutation.mutateAsync(data);
        if (!response.success || !response.data) {
            toast.error(response.message || 'Không thể khởi tạo cuộc trò chuyện.');
            return null;
        }
        return response.data;
    };

    const loadOpenConversation = useCallback(async (): Promise<ConversationDetailResponse | null> => {
        setIsLoadingOpen(true);
        try {
            const response = await chatConversationService.getOpen();
            if (!response.success) {
                return null;
            }
            return response.data ?? null;
        } catch {
            // No open conversation / transient failure — empty chat state is fine.
            return null;
        } finally {
            setIsLoadingOpen(false);
        }
    }, []);

    const escalateConversation = async (
        conversationId: number,
        reason: EscalationReason = 'CUSTOMER_REQUEST'
    ): Promise<ConversationDetailResponse | null> => {
        try {
            const response = await chatConversationService.escalate(conversationId, { reason });
            if (!response.success || !response.data) {
                toast.error(response.message || 'Không thể chuyển yêu cầu cho nhân viên.');
                return null;
            }
            return response.data;
        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Không thể chuyển yêu cầu cho nhân viên.'));
            return null;
        }
    };

    const cancelStaffRequest = async (
        conversationId: number
    ): Promise<ConversationDetailResponse | null> => {
        try {
            const response = await chatConversationService.cancelStaffRequest(conversationId);
            if (!response.success || !response.data) {
                toast.error(response.message || 'Không thể huỷ yêu cầu gặp nhân viên.');
                return null;
            }
            return response.data;
        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Không thể huỷ yêu cầu gặp nhân viên.'));
            return null;
        }
    };

    const sendRealtimeMessage = async (conversationId: number, content: string): Promise<void> => {
        await connect();
        await socketService.sendChatMessage({
            conversationId,
            content,
            type: 'TEXT',
        });
    };

    const subscribeToCustomerInbox = useCallback(
        async (
            callbacks: {
                onMessage?: (payload: ChatSocketMessageEvent) => void;
                onConversationEvent?: (payload: ChatConversationSocketEvent) => void;
            }
        ) => {
            await connect();
            return socketService.subscribeCustomerInbox((payload) => {
                if (isChatConversationSocketEvent(payload)) {
                    callbacks.onConversationEvent?.(payload);
                    return;
                }
                callbacks.onMessage?.(payload);
            });
        },
        [connect, socketService]
    );

    const subscribeToConversation = useCallback(
        async (
            conversationId: number,
            callbacks: {
                onMessage?: (payload: ChatSocketMessageEvent) => void;
                onConversationEvent?: (payload: ChatConversationSocketEvent) => void;
            }
        ) => {
            await connect();
            return socketService.subscribeConversation(conversationId, (payload) => {
                if (isChatConversationSocketEvent(payload)) {
                    callbacks.onConversationEvent?.(payload);
                    return;
                }
                callbacks.onMessage?.(payload);
            });
        },
        [connect, socketService]
    );

    const markConversationAsRead = useCallback(async (conversationId: number): Promise<void> => {
        try {
            await chatConversationService.markAsRead(conversationId);
        } catch {
            // Read receipt is best-effort; ignore transient failures.
        }
    }, []);

    const loadConversationDetail = useCallback(async (
        conversationId: number
    ): Promise<ConversationDetailResponse | null> => {
        try {
            const response = await chatConversationService.getDetail(conversationId);
            if (!response.success || !response.data) {
                return null;
            }
            return response.data;
        } catch (error: any) {
            const status = error?.response?.status;
            // Missing/stale conversation is an empty state, not a user-facing error.
            if (status === 404) {
                return null;
            }
            toast.error(getErrorMessage(error, 'Không thể tải cuộc trò chuyện.'));
            return null;
        }
    }, []);

    return {
        initConversation,
        loadOpenConversation,
        loadConversationDetail,
        escalateConversation,
        cancelStaffRequest,
        markConversationAsRead,
        sendRealtimeMessage,
        subscribeToConversation,
        subscribeToCustomerInbox,
        isInitializing: initMutation.isPending,
        isLoadingOpen,
    };
};
