export type {
    Conversation,
    Message,
    ConversationCloseReason,
    ConversationDetailResponse,
    ConversationResponse,
    CustomerChatTimelineResponse,
    EscalationReason,
    ChatMessageResponse,
    ChatConversationSocketEvent,
} from '../../../../types/chat.type';

export {
    MessageSenderRole,
    ConversationStatusEnum,
    CLOSE_REASON_OPTIONS,
} from '../../../../types/chat.type';

export interface AiServiceConfig {
    serviceName: string;
    description?: string;
    enabled: boolean;
    operational: boolean;
    updatedAt?: string;
    lastModifiedBy?: string;
}
