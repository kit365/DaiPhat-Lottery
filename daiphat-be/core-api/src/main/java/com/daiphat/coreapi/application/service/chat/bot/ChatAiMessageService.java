package com.daiphat.coreapi.application.service.chat.bot;

import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.out.chat.ChatMessagePublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ChatAiMessageService implements ChatAiMessagePort {

    private final MessageRepositoryPort messageRepositoryPort;
    private final ConversationRepositoryPort conversationRepositoryPort;
    private final ChatMessagePublisherPort chatMessagePublisherPort;
    private final ChatApplicationMapper chatApplicationMapper;
    private final String botDisplayName;

    public ChatAiMessageService(
            MessageRepositoryPort messageRepositoryPort,
            ConversationRepositoryPort conversationRepositoryPort,
            ChatMessagePublisherPort chatMessagePublisherPort,
            ChatApplicationMapper chatApplicationMapper,
            @Value("${daiphat.chat.ai.bot-display-name}") String botDisplayName
    ) {
        this.messageRepositoryPort = messageRepositoryPort;
        this.conversationRepositoryPort = conversationRepositoryPort;
        this.chatMessagePublisherPort = chatMessagePublisherPort;
        this.chatApplicationMapper = chatApplicationMapper;
        this.botDisplayName = botDisplayName;
    }

    @Override
    public void saveAndPublish(ConversationModel conversation, String content, Long parentId) {
        MessageModel aiMessage = MessageModel.builder()
                .conversationId(conversation.getId())
                .parentId(parentId)
                .senderId(null)
                .senderType(MessageSenderType.AI_SYSTEM)
                .content(content)
                .type(MessageType.TEXT)
                .build();
        persistAndPublish(conversation, aiMessage);
    }

    @Override
    public void saveBotReply(ConversationModel conversation, String content, Long parentId, String intent) {
        saveBotReply(conversation, content, content, parentId, intent);
    }

    @Override
    public void saveBotReply(
            ConversationModel conversation,
            String content,
            String displayContent,
            Long parentId,
            String intent
    ) {
        MessageModel aiMessage = MessageModel.builder()
                .conversationId(conversation.getId())
                .parentId(parentId)
                .senderId(null)
                .senderType(MessageSenderType.AI_SYSTEM)
                .content(content)
                .intent(intent)
                .type(MessageType.TEXT)
                .build();
        persistAndPublish(conversation, aiMessage, displayContent);
    }

    @Override
    public void saveSystemNoticeAndPublish(ConversationModel conversation, String content) {
        MessageModel notice = MessageModel.systemDivider(conversation.getId(), content);
        MessageModel savedMessage = messageRepositoryPort.save(notice);
        publishSocketMessage(conversation, savedMessage, savedMessage.getContent());
    }

    private void persistAndPublish(ConversationModel conversation, MessageModel message) {
        persistAndPublish(conversation, message, message.getContent());
    }

    private void persistAndPublish(ConversationModel conversation, MessageModel message, String displayContent) {
        message.initializeForCreate();
        message.validate();

        MessageModel savedMessage = messageRepositoryPort.save(message);
        touchLastMessage(conversation, MessageSenderType.AI_SYSTEM, savedMessage.getCreatedAt());
        publishSocketMessage(conversation, savedMessage, displayContent);
    }

    private void publishSocketMessage(ConversationModel conversation, MessageModel savedMessage, String displayContent) {
        ChatMessageSocketResponse baseResponse = chatApplicationMapper.enrichSocketResponse(
                chatApplicationMapper.toChatMessageSocketResponse(savedMessage),
                botDisplayName
        );
        ChatMessageSocketResponse response = ChatMessageSocketResponse.builder()
                .id(baseResponse.id())
                .conversationId(baseResponse.conversationId())
                .parentId(baseResponse.parentId())
                .senderId(baseResponse.senderId())
                .senderName(baseResponse.senderName())
                .senderType(baseResponse.senderType())
                .content(displayContent != null && !displayContent.isBlank() ? displayContent : savedMessage.getContent())
                .intent(baseResponse.intent())
                .type(baseResponse.type())
                .createdAt(baseResponse.createdAt())
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
