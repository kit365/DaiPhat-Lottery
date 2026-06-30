import { useMutation } from '@tanstack/react-query';
import { chatConversationService } from '../services/chatConversationService';
import { AppToast as toast } from '../utils/toast.util';
import { InitConversationRequest, ConversationDetailResponse } from '../../types/chat.type';
import { useWebSocket } from '../../hooks/useWebSocket';

const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.message || fallback;

export const useChatConversation = () => {
    const { connect, socketService } = useWebSocket();

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

    const sendRealtimeMessage = async (conversationId: number, content: string): Promise<void> => {
        await connect();
        await socketService.sendChatMessage({
            conversationId,
            content,
            type: 'TEXT',
        });
    };

    return {
        initConversation,
        sendRealtimeMessage,
        isInitializing: initMutation.isPending,
    };
};
