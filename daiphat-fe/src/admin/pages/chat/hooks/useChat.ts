import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../../api/chat.api';
import { Message } from '../types/chat';

export const useConversations = () => {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: api.getConversations,
        select: (res: any) => res.data || [],
    });
};

export const useMessages = (conversationId: string | null) => {
    return useQuery({
        queryKey: ['messages', conversationId],
        queryFn: () => api.getMessages(conversationId!),
        enabled: !!conversationId,
        select: (res: any) => res.data || [],
    });
};

export const useSendMessage = (conversationId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (content: string) => api.sendMessage(conversationId!, content),
        onSuccess: (res) => {
            const newMessage = res.data;
            queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => [
                ...old,
                newMessage,
            ]);
            // Also update the last message in conversations list
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
};
