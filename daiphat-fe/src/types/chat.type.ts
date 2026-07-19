import { ApiResponse } from './api.type';

export enum ConversationStatusEnum {
    OPEN = 'OPEN',
    ACTIVE = 'ACTIVE',
    WAITING_FOR_OPERATOR = 'WAITING_FOR_OPERATOR',
    WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
    CLOSED = 'CLOSED',
}
export type ConversationStatus = ConversationStatusEnum;

export type EscalationReason =
    | 'CUSTOMER_REQUEST'
    | 'BOT_LOW_CONFIDENCE'
    | 'AI_SERVICE_UNAVAILABLE'
    | 'AI_DISABLED'
    | 'STAFF_MANUAL';

export type ConversationCloseReason =
    | 'RESOLVED'
    | 'CUSTOMER_NO_RESPONSE'
    | 'SPAM'
    | 'OTHER'
    | 'AUTO_INACTIVITY';

export type ConversationSocketEventType =
    | 'CONVERSATION_ESCALATED'
    | 'CONVERSATION_ASSIGNED'
    | 'CONVERSATION_TAKEN'
    | 'CONVERSATION_UNASSIGNED'
    | 'CONVERSATION_STAFF_REQUEST_CANCELLED'
    | 'CONVERSATION_CLOSED'
    | 'MESSAGE_READ';

export enum MessageSenderRole {
    CUSTOMER = 'CUSTOMER',
    OPERATOR = 'OPERATOR',
    AI_SYSTEM = 'AI_SYSTEM',
}
export type MessageSenderType = MessageSenderRole;
export type ChatMessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface ChatAiStatusResponse {
    enabled: boolean;
}

export interface InitConversationRequest {
    title?: string;
    content?: string;
    /** Khách chủ động yêu cầu nhân viên — bỏ qua AI, chuyển thẳng escalate */
    requestStaff?: boolean;
}

export interface EscalateConversationRequest {
    reason?: EscalationReason;
}

export interface ChatConversationSocketEvent {
    eventType: ConversationSocketEventType;
    conversationId: number;
    status: ConversationStatus;
    assignedOperatorId?: string | null;
    reason?: EscalationReason | null;
    customerLastReadAt?: string | null;
    customerName?: string;
    customer?: {
        name?: string;
        fullName?: string;
        firstName?: string;
        lastName?: string;
    };
    createdAt?: string | null;
}

export interface ConversationResponse {
    id: number;
    title: string;
    status: ConversationStatus;
    customerId: string;
    assignedOperatorId?: string | null;
    assignedOperatorName?: string | null;
    customerLastReadAt?: string | null;
    customerName?: string;
    customer?: {
        name?: string;
        fullName?: string;
        firstName?: string;
        lastName?: string;
    };
    operatorLastReadAt?: string | null;
    unreadCount?: number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

export interface ChatMessageResponse {
    id: number;
    conversationId: number;
    parentId?: number | null;
    senderId?: string | null;
    senderType: MessageSenderType;
    content?: string | null;
    intent?: string | null;
    confidence?: number | null;
    type: ChatMessageType;
    fileUrl?: string | null;
    fileName?: string | null;
    isEdited: boolean;
    editedAt?: string | null;
    isRead: boolean;
    readerCount: number;
    isDeleted: boolean;
    deletedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ConversationDetailResponse {
    conversation: ConversationResponse;
    messages: ChatMessageResponse[];
}

export type InitConversationApiResponse = ApiResponse<ConversationDetailResponse>;


export interface Message {
    id: number;
    senderId: string;
    senderType: ChatMessageResponse['senderType'];
    conversationId: number;
    content: string;
    type: ChatMessageResponse['type'];
    createdAt: string;
    isRead?: boolean;
}

export interface Conversation extends ConversationResponse {
    _id?: string;
    lastMessage?: Message;
}

export interface SessionBoundaryResponse {
    conversationId: number;
    sessionStartedAt?: string | null;
    gapLabel?: string | null;
    previousCloseReason?: ConversationCloseReason | null;
    previousCloseReasonLabel?: string | null;
    previousOperatorId?: string | null;
    previousOperatorName?: string | null;
    previousSessionEndedAt?: string | null;
}

export interface CustomerChatTimelineItem {
    message: ChatMessageResponse;
    sessionBoundary?: SessionBoundaryResponse | null;
}

export interface CustomerChatTimelineResponse {
    items: CustomerChatTimelineItem[];
    hasMore: boolean;
    nextCursor?: string | null;
}

export const CLOSE_REASON_OPTIONS: Array<{ value: ConversationCloseReason; label: string }> = [
    { value: 'RESOLVED', label: 'Đã giải quyết' },
    { value: 'CUSTOMER_NO_RESPONSE', label: 'Khách không phản hồi' },
    { value: 'SPAM', label: 'Spam' },
    { value: 'OTHER', label: 'Khác' },
];

export const BACKEND_HANDOFF_ESCALATION_REASONS: EscalationReason[] = [
    'CUSTOMER_REQUEST',
    'AI_DISABLED',
    'AI_SERVICE_UNAVAILABLE',
    'BOT_LOW_CONFIDENCE',
];
