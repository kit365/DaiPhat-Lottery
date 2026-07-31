package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepositoryPort {

    MessageModel save(MessageModel message);

    List<MessageModel> findByConversationId(Long conversationId);

    List<MessageModel> findRecentBotMessagesByConversationId(
            Long conversationId,
            MessageSenderType senderType,
            int limit
    );

    boolean existsByConversationIdAndSenderType(Long conversationId, MessageSenderType senderType);

    int countUnreadByConversationId(Long conversationId, UUID readerUserId, LocalDateTime lastReadAt);

    int countInboundUnreadForStaff(Long conversationId);

    int markInboundMessagesAsReadByCustomer(Long conversationId, LocalDateTime readAt);

    int markAllInboundUnreadMessagesAsReadByCustomer(Long conversationId);

    List<MessageModel> findCustomerTimelinePage(
            UUID customerId,
            LocalDateTime beforeCreatedAt,
            Long beforeId,
            int limit,
            Collection<Long> conversationIds
    );

    Optional<MessageModel> findCustomerTimelineMessageBefore(
            UUID customerId,
            LocalDateTime createdAt,
            Long id,
            Collection<Long> conversationIds
    );

    List<Long> findOperatorParticipatedConversationIds(UUID customerId, UUID operatorId);

    boolean hasOlderMessageInConversation(Long conversationId, LocalDateTime createdAt, Long id);

    boolean existsOperatorParticipation(UUID customerId, UUID operatorId);
}
