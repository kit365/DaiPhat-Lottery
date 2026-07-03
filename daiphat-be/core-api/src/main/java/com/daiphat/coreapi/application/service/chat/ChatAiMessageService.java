package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatAiProperties;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.out.chat.ChatMessagePublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatAiMessageService implements ChatAiMessagePort {

    private final MessageRepositoryPort messageRepositoryPort;
    private final ConversationRepositoryPort conversationRepositoryPort;
    private final ChatMessagePublisherPort chatMessagePublisherPort;
    private final ChatAiProperties chatAiProperties;

    @Override
    public MessageModel saveAndPublish(ConversationModel conversation, String content, Long parentId) {
        MessageModel aiMessage = MessageModel.builder()
                .conversationId(conversation.getId())
                .parentId(parentId)
                .senderId(null)
                .senderType(MessageSenderType.AI_SYSTEM)
                .content(content)
                .type(MessageType.TEXT)
                .build();
        return persistAndPublish(conversation, aiMessage);
    }

    @Override
    public MessageModel saveSystemNoticeAndPublish(ConversationModel conversation, String content) {
        MessageModel notice = MessageModel.systemDivider(conversation.getId(), content);
        MessageModel savedMessage = messageRepositoryPort.save(notice);
        publishSocketMessage(conversation, savedMessage);
        return savedMessage;
    }

    private MessageModel persistAndPublish(ConversationModel conversation, MessageModel message) {
        message.initializeForCreate();
        message.validate();

        MessageModel savedMessage = messageRepositoryPort.save(message);
        touchLastMessage(conversation, MessageSenderType.AI_SYSTEM, savedMessage.getCreatedAt());
        publishSocketMessage(conversation, savedMessage);
        return savedMessage;
    }

    private void publishSocketMessage(ConversationModel conversation, MessageModel savedMessage) {
        ChatMessageSocketResponse response = ChatMessageSocketResponse.builder()
                .id(savedMessage.getId())
                .conversationId(savedMessage.getConversationId())
                .parentId(savedMessage.getParentId())
                .senderId(savedMessage.getSenderId())
                .senderName(chatAiProperties.getBotDisplayName())
                .senderType(savedMessage.getSenderType())
                .content(savedMessage.getContent())
                .type(savedMessage.getType())
                .createdAt(savedMessage.getCreatedAt())
                .build();
        chatMessagePublisherPort.publishToConversation(conversation.getId(), response);
        chatMessagePublisherPort.publishToCustomer(conversation.getCustomerId(), response);
    }

    private void touchLastMessage(
            ConversationModel conversation,
            MessageSenderType senderType,
            java.time.LocalDateTime at
    ) {
        conversation.recordLastMessage(senderType, at);
        conversationRepositoryPort.save(conversation);
    }
}
