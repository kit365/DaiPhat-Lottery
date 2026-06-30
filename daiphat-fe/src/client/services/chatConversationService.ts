import { apiApp } from '../../api';
import { InitConversationApiResponse, InitConversationRequest } from '../../types/chat.type';

const BASE_URL = '/chat/conversations';

export const chatConversationService = {
    init: async (data: InitConversationRequest): Promise<InitConversationApiResponse> => {
        const response = await apiApp.post<InitConversationApiResponse>(`${BASE_URL}/init`, data);
        return response.data;
    },
};
