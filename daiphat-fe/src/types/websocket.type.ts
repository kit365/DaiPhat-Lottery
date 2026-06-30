export type ChatSocketMessageType = 'TEXT' | 'IMAGE' | 'FILE';

export interface WebSocketSubscription {
    unsubscribe: () => void;
}

export interface NotificationSocketEvent {
    type: string;
    title?: string | null;
    content?: string | null;
    referenceId?: string | null;
    referenceType?: string | null;
    createdAt?: string | null;
}

export interface OverrunAlertSocketEvent {
    ticketServiceOrderId: string;
    ticketServiceOrderCode: string;
    message: string;
}

export interface ChatSocketMessagePayload {
    conversationId: number;
    parentId?: number | null;
    content: string;
    type?: ChatSocketMessageType;
}

export interface ChatSocketMessageEvent {
    conversationId: number;
    parentId?: number | null;
    senderId: string;
    senderName: string;
    content: string;
    type: ChatSocketMessageType;
    createdAt: string;
}
