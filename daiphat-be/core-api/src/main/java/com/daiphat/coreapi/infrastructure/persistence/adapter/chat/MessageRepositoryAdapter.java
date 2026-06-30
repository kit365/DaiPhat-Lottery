package com.daiphat.coreapi.infrastructure.persistence.adapter.chat;

import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.chat.ChatPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.chat.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MessageRepositoryAdapter implements MessageRepositoryPort {

    private final MessageRepository messageRepository;
    private final ChatPersistenceMapper chatPersistenceMapper;

    @Override
    public MessageModel save(MessageModel message) {
        return chatPersistenceMapper.toMessageDomain(
                messageRepository.save(chatPersistenceMapper.toMessageEntity(message))
        );
    }

    @Override
    public List<MessageModel> findByConversationId(Long conversationId) {
        return chatPersistenceMapper.toMessageDomains(
                messageRepository.findByConversation_IdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(conversationId)
        );
    }

    @Override
    public int countUnreadByConversationId(Long conversationId, UUID readerUserId, LocalDateTime lastReadAt) {
        return messageRepository.countUnreadByConversationId(conversationId, readerUserId, lastReadAt);
    }
}
