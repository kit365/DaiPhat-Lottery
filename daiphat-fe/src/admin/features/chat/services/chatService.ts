import { apiApp } from '../../../../api';
import { ApiResponse } from '../../../../types/api.type';
import {
    ChatMessageResponse,
    ConversationCloseReason,
    ConversationDetailResponse,
    ConversationResponse,
    CustomerChatTimelineResponse,
    EscalationReason,
    Conversation,
    Message,
} from '../../../../types/chat.type';
import { AiServiceConfig } from '../types/chat.type';

const BASE_URL = '/chat/conversations';

export const mapMessage = (message: ChatMessageResponse): Message => ({
    id: message.id,
    senderId: message.senderId ?? '',
    senderType: message.senderType,
    conversationId: message.conversationId,
    content: message.content?.trim() || '',
    type: message.type,
    createdAt: message.createdAt || new Date().toISOString(),
    isRead: message.isRead,
});

export const mapConversation = (conversation: ConversationResponse): Conversation => ({
    ...conversation,
});

export const chatService = {
    getAiConfig: async (): Promise<AiServiceConfig> => {
        const response = await apiApp.get<ApiResponse<AiServiceConfig>>('/admin/chat/ai-config');
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể tải trạng thái trợ lý AI');
        }

        return payload.data;
    },

    updateAiStatus: async (enabled: boolean): Promise<AiServiceConfig> => {
        const response = await apiApp.patch<ApiResponse<AiServiceConfig>>(
            '/admin/chat/ai-config',
            { enabled }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể cập nhật trạng thái trợ lý AI');
        }

        return payload.data;
    },

    getConversations: async (): Promise<Conversation[]> => {
        const response = await apiApp.get<ApiResponse<ConversationResponse[]>>(`${BASE_URL}/management`);
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể tải danh sách hội thoại');
        }

        return payload.data.map(mapConversation);
    },

        getConversationDetail: async (
        conversationId: number
    ): Promise<{ conversation: Conversation; messages: Message[]; context?: ConversationDetailResponse['context'] }> => {
        const response = await apiApp.get<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/management/${conversationId}`,
            { skipGlobalErrorToast: true }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể tải chi tiết hội thoại');
        }

        const messages = payload.data.messages
            .filter((message) => message.type === 'TEXT' || message.type === 'SYSTEM')
            .map(mapMessage);

        return {
            conversation: mapConversation(payload.data.conversation),
            messages,
            context: payload.data.context ?? null,
        };
    },

    getPreviousSessionMessages: async (conversationId: number): Promise<Message[]> => {
        const response = await apiApp.get<ApiResponse<ChatMessageResponse[]>>(
            `${BASE_URL}/management/${conversationId}/previous-session-messages`,
            { skipGlobalErrorToast: true }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể tải phiên hỗ trợ trước');
        }

        return payload.data.map(mapMessage);
    },

    getPreHandoffMessages: async (conversationId: number): Promise<Message[]> => {
        const response = await apiApp.get<ApiResponse<ChatMessageResponse[]>>(
            `${BASE_URL}/management/${conversationId}/pre-handoff-messages`,
            { skipGlobalErrorToast: true }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể tải lịch sử chat AI');
        }

        return payload.data.map(mapMessage);
    },

    assignToMe: async (conversationId: number): Promise<ConversationDetailResponse> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/management/${conversationId}/assign/me`,
            undefined,
            { skipGlobalErrorToast: true }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể nhận hội thoại');
        }

        return payload.data;
    },

    unassign: async (conversationId: number): Promise<ConversationDetailResponse> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/management/${conversationId}/unassign`
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể trả hội thoại');
        }

        return payload.data;
    },

    escalate: async (
        conversationId: number,
        reason: EscalationReason = 'STAFF_MANUAL'
    ): Promise<ConversationDetailResponse> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/management/${conversationId}/escalate`,
            { reason }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể chuyển hội thoại vào hàng chờ');
        }

        return payload.data;
    },

    close: async (
        conversationId: number,
        reason: ConversationCloseReason = 'RESOLVED'
    ): Promise<ConversationDetailResponse> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/management/${conversationId}/close`,
            { reason }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể đóng hội thoại');
        }

        return payload.data;
    },

    getCustomerTimeline: async (
        customerId: string,
        params?: {
            limit?: number;
            beforeCreatedAt?: string;
            beforeId?: number;
        }
    ): Promise<CustomerChatTimelineResponse> => {
        const response = await apiApp.get<ApiResponse<CustomerChatTimelineResponse>>(
            `${BASE_URL}/management/customers/${customerId}/messages`,
            { params }
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            throw new Error(payload.message || 'Không thể tải lịch sử hội thoại');
        }

        return {
            ...payload.data,
            items: payload.data.items.map((item) => ({
                ...item,
                message: {
                    ...item.message,
                    content: item.message.content?.trim() || '',
                },
            })),
        };
    },
};
