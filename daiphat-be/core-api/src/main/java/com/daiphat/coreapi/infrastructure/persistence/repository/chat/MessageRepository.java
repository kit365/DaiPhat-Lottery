package com.daiphat.coreapi.infrastructure.persistence.repository.chat;

import com.daiphat.coreapi.infrastructure.persistence.entity.chat.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    List<MessageEntity> findByConversation_IdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long conversationId);

    @Query("""
            select count(m)
            from MessageEntity m
            where m.deletedAt is null
              and m.conversation.id = :conversationId
              and (m.sender.id is null or m.sender.id <> :readerUserId)
              and (:lastReadAt is null or m.createdAt > :lastReadAt)
            """)
    int countUnreadByConversationId(Long conversationId, UUID readerUserId, LocalDateTime lastReadAt);
}
