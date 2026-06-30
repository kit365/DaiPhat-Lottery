package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.MessageModel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MessageRepositoryPort {

    MessageModel save(MessageModel message);

    List<MessageModel> findByConversationId(Long conversationId);

    int countUnreadByConversationId(Long conversationId, UUID readerUserId, LocalDateTime lastReadAt);
}
