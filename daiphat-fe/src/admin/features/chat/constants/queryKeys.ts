export const QUERY_KEYS = {
    CONVERSATIONS: 'admin-chat-conversations',
    MESSAGES: 'admin-chat-messages',
    DETAIL: 'admin-chat-detail',
} as const;

export const ADMIN_CHAT_CONVERSATIONS_KEY = ['admin', 'chat', 'conversations'] as const;
export const ADMIN_CHAT_AI_CONFIG_KEY = ['admin', 'chat', 'ai-config'] as const;

export const adminChatMessagesKey = (conversationId: string | number) =>
    ['admin', 'chat', 'messages', conversationId] as const;

export const adminChatDetailKey = (conversationId: string | number) =>
    ['admin', 'chat', 'detail', conversationId] as const;
