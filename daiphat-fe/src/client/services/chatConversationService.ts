import { apiApp } from '../../api';
import {
    ChatAiStatusResponse,
    ConversationDetailResponse,
    CustomerChatTimelineResponse,
    EscalateConversationRequest,
    InitConversationApiResponse,
    InitConversationRequest,
} from '../../types/chat.type';
import { ApiResponse } from '../../types/api.type';

const BASE_URL = '/chat/conversations';

export const chatConversationService = {
    getAiStatus: async (): Promise<ChatAiStatusResponse> => {
        try {
            const response = await apiApp.get<ApiResponse<ChatAiStatusResponse>>(
                '/chat/ai-status',
                { skipGlobalErrorToast: true } as any
            );
            return response.data.data ?? { enabled: true };
        } catch {
            // Fail open: do not hide AI chips if status endpoint is temporarily unavailable.
            return { enabled: true };
        }
    },

    init: async (data: InitConversationRequest): Promise<InitConversationApiResponse> => {
        const response = await apiApp.post<InitConversationApiResponse>(`${BASE_URL}/init`, data);
        return response.data;
    },

    getOpen: async (): Promise<ApiResponse<ConversationDetailResponse | null>> => {
        const response = await apiApp.get<ApiResponse<ConversationDetailResponse | null>>(
            `${BASE_URL}/my/open`,
            { skipGlobalErrorToast: true } as any
        );
        return response.data;
    },

    getDetail: async (conversationId: number): Promise<ApiResponse<ConversationDetailResponse | null>> => {
        const response = await apiApp.get<ApiResponse<ConversationDetailResponse | null>>(
            `${BASE_URL}/my/${conversationId}`,
            { skipGlobalErrorToast: true } as any
        );
        return response.data;
    },

    escalate: async (
        conversationId: number,
        data: EscalateConversationRequest = { reason: 'CUSTOMER_REQUEST' }
    ): Promise<ApiResponse<ConversationDetailResponse>> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/my/${conversationId}/escalate`,
            data
        );
        return response.data;
    },

    cancelStaffRequest: async (conversationId: number): Promise<ApiResponse<ConversationDetailResponse>> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/my/${conversationId}/cancel-staff-request`
        );
        return response.data;
    },

    disconnectStaff: async (conversationId: number): Promise<ApiResponse<ConversationDetailResponse>> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/my/${conversationId}/disconnect-staff`
        );
        return response.data;
    },

    markAsRead: async (conversationId: number): Promise<ApiResponse<ConversationDetailResponse>> => {
        const response = await apiApp.post<ApiResponse<ConversationDetailResponse>>(
            `${BASE_URL}/my/${conversationId}/read`
        );
        return response.data;
    },

    getMyTimeline: async (params?: {
        limit?: number;
        beforeCreatedAt?: string;
        beforeId?: number;
    }): Promise<CustomerChatTimelineResponse> => {
        const response = await apiApp.get<ApiResponse<CustomerChatTimelineResponse>>(
            `${BASE_URL}/my/timeline`,
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
