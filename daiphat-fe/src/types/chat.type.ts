import { ApiResponse } from './api.type';

export type ConversationStatus =
    | 'OPEN'
    | 'ACTIVE'
    | 'WAITING_FOR_OPERATOR'
    | 'WAITING_FOR_CUSTOMER'
    | 'CLOSED';

export type ParticipationRole = 'CUSTOMER' | 'OPERATOR' | 'SUPERVISOR';
export type AssigneeType = 'AI_BOT' | 'HUMAN_OPERATOR';
export type MessageSenderType = 'CUSTOMER' | 'OPERATOR' | 'AI_SYSTEM';
export type ChatMessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface InitConversationRequest {
    title?: string;
    content?: string;
}

export interface ConversationResponse {
    id: number;
    title: string;
    status: ConversationStatus;
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

export interface ParticipationResponse {
    id: number;
    conversationId: number;
    userId: string;
    role: ParticipationRole;
    lastReadAt?: string | null;
    isActive: boolean;
    assigneeType?: AssigneeType | null;
    joinedAt?: string | null;
    leftAt?: string | null;
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
    participations: ParticipationResponse[];
    messages: ChatMessageResponse[];
}

export type InitConversationApiResponse = ApiResponse<ConversationDetailResponse>;
