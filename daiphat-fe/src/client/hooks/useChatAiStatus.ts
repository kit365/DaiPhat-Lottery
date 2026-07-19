import { useQuery } from '@tanstack/react-query';
import { chatConversationService } from '../services/chatConversationService';

const CHAT_AI_STATUS_KEY = ['client', 'chat', 'ai-status'] as const;

export const useChatAiStatus = (enabled: boolean) =>
    useQuery({
        queryKey: CHAT_AI_STATUS_KEY,
        queryFn: chatConversationService.getAiStatus,
        enabled,
        staleTime: 5_000,
        refetchInterval: 10_000,
        refetchOnWindowFocus: true,
        // Until the first successful fetch, keep AI features visible.
        placeholderData: { enabled: true },
        retry: 1,
    });
