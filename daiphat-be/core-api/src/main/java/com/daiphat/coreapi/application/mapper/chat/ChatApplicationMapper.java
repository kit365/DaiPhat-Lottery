package com.daiphat.coreapi.application.mapper.chat;

import com.daiphat.coreapi.application.dto.request.chat.CreateConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.CreateMessageRequest;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ChatApplicationMapper {

    ConversationModel toConversationModel(CreateConversationRequest request);

    MessageModel toMessageModel(CreateMessageRequest request);

    ConversationResponse toConversationResponse(ConversationModel model);

    List<ConversationResponse> toConversationResponses(List<ConversationModel> models);

    MessageResponse toMessageResponse(MessageModel model);

    List<MessageResponse> toMessageResponses(List<MessageModel> models);

    ChatMessageSocketResponse toChatMessageSocketResponse(MessageModel model);

    default MessageResponse markAsRead(MessageResponse response) {
        if (response == null || response.isRead()) {
            return response;
        }
        return MessageResponse.builder()
                .id(response.id())
                .conversationId(response.conversationId())
                .parentId(response.parentId())
                .senderId(response.senderId())
                .senderType(response.senderType())
                .content(response.content())
                .intent(response.intent())
                .confidence(response.confidence())
                .type(response.type())
                .fileUrl(response.fileUrl())
                .fileName(response.fileName())
                .isEdited(response.isEdited())
                .editedAt(response.editedAt())
                .isRead(true)
                .readerCount(Math.max(response.readerCount(), 1))
                .isDeleted(response.isDeleted())
                .deletedAt(response.deletedAt())
                .createdAt(response.createdAt())
                .updatedAt(response.updatedAt())
                .build();
    }

    default ConversationResponse enrichConversationResponse(
            ConversationResponse response,
            String assignedOperatorName,
            Integer unreadCount
    ) {
        if (response == null) {
            return null;
        }
        return ConversationResponse.builder()
                .id(response.id())
                .title(response.title())
                .status(response.status())
                .customerId(response.customerId())
                .assignedOperatorId(response.assignedOperatorId())
                .assignedOperatorName(assignedOperatorName)
                .customerLastReadAt(response.customerLastReadAt())
                .operatorLastReadAt(response.operatorLastReadAt())
                .unreadCount(unreadCount)
                .createdAt(response.createdAt())
                .updatedAt(response.updatedAt())
                .deletedAt(response.deletedAt())
                .escalationReason(response.escalationReason())
                .escalatedAt(response.escalatedAt())
                .handoffSummary(response.handoffSummary())
                .build();
    }

    default ChatMessageSocketResponse enrichSocketResponse(
            ChatMessageSocketResponse response,
            String senderName
    ) {
        if (response == null) {
            return null;
        }
        return ChatMessageSocketResponse.builder()
                .id(response.id())
                .conversationId(response.conversationId())
                .parentId(response.parentId())
                .senderId(response.senderId())
                .senderName(senderName)
                .senderType(response.senderType())
                .content(response.content())
                .intent(response.intent())
                .type(response.type())
                .createdAt(response.createdAt())
                .build();
    }
}
