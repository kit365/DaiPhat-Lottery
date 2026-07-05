package com.daiphat.coreapi.infrastructure.adapter.out.chat.persistence;

import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.MessageEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.chat.ChatPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.chat.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
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
    public List<MessageModel> findRecentBotMessagesByConversationId(
            Long conversationId,
            MessageSenderType senderType,
            int limit
    ) {
        if (conversationId == null || senderType == null || limit <= 0) {
            return List.of();
        }
        return chatPersistenceMapper.toMessageDomains(
                messageRepository.findByConversation_IdAndDeletedAtIsNullAndSenderTypeOrderByCreatedAtDescIdDesc(
                        conversationId,
                        senderType,
                        PageRequest.of(0, limit)
                )
        );
    }

    @Override
    public boolean existsByConversationIdAndSenderType(Long conversationId, MessageSenderType senderType) {
        return messageRepository.existsByConversation_IdAndDeletedAtIsNullAndSenderType(conversationId, senderType);
    }

    @Override
    public int countUnreadByConversationId(Long conversationId, UUID readerUserId, LocalDateTime lastReadAt) {
        if (lastReadAt == null) {
            return Math.toIntExact(
                    messageRepository.countByConversation_IdAndDeletedAtIsNullAndSender_IdNot(conversationId, readerUserId)
                            + messageRepository.countByConversation_IdAndDeletedAtIsNullAndSenderIsNull(conversationId)
            );
        }

        return Math.toIntExact(
                messageRepository.countByConversation_IdAndDeletedAtIsNullAndSender_IdNotAndCreatedAtAfter(
                        conversationId,
                        readerUserId,
                        lastReadAt
                ) + messageRepository.countByConversation_IdAndDeletedAtIsNullAndSenderIsNullAndCreatedAtAfter(
                        conversationId,
                        lastReadAt
                )
        );
    }

    @Override
    public int markInboundMessagesAsReadByCustomer(Long conversationId, LocalDateTime readAt) {
        List<MessageEntity> unreadMessages = messageRepository
                .findByConversation_IdAndDeletedAtIsNullAndSenderTypeNotAndIsReadFalseAndCreatedAtLessThanEqual(
                        conversationId,
                        MessageSenderType.CUSTOMER,
                        readAt
                );
        return persistMarkedRead(unreadMessages);
    }

    @Override
    public int markAllInboundUnreadMessagesAsReadByCustomer(Long conversationId) {
        List<MessageEntity> unreadMessages = messageRepository
                .findByConversation_IdAndDeletedAtIsNullAndSenderTypeNotAndIsReadFalse(
                        conversationId,
                        MessageSenderType.CUSTOMER
                );
        return persistMarkedRead(unreadMessages);
    }

    @Override
    public List<MessageModel> findCustomerTimelinePage(
            UUID customerId,
            LocalDateTime beforeCreatedAt,
            Long beforeId,
            int limit,
            Collection<Long> conversationIds
    ) {
        if (conversationIds != null && conversationIds.isEmpty()) {
            return List.of();
        }

        PageRequest pageable = PageRequest.of(0, limit);
        List<MessageEntity> messages;
        if (beforeCreatedAt == null) {
            messages = conversationIds == null
                    ? messageRepository.findByConversation_Customer_IdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(
                            customerId,
                            pageable
                    )
                    : messageRepository.findByConversation_Customer_IdAndConversation_IdInAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(
                            customerId,
                            conversationIds,
                            pageable
                    );
        } else {
            messages = findTimelineBeforeCursor(customerId, conversationIds, beforeCreatedAt, beforeId, limit);
        }

        return chatPersistenceMapper.toMessageDomains(messages);
    }

    @Override
    public Optional<MessageModel> findCustomerTimelineMessageBefore(
            UUID customerId,
            LocalDateTime createdAt,
            Long id,
            Collection<Long> conversationIds
    ) {
        if (conversationIds != null && conversationIds.isEmpty()) {
            return Optional.empty();
        }

        return findTimelineBeforeCursor(customerId, conversationIds, createdAt, id, 1).stream()
                .findFirst()
                .map(chatPersistenceMapper::toMessageDomain);
    }

    @Override
    public List<Long> findOperatorParticipatedConversationIds(UUID customerId, UUID operatorId) {
        LinkedHashSet<Long> conversationIds = new LinkedHashSet<>();
        for (MessageEntity message : messageRepository.findByConversation_Customer_IdAndDeletedAtIsNullAndSender_IdAndSenderType(
                customerId,
                operatorId,
                MessageSenderType.OPERATOR
        )) {
            if (message.getConversation() != null && message.getConversation().getId() != null) {
                conversationIds.add(message.getConversation().getId());
            }
        }
        return List.copyOf(conversationIds);
    }

    @Override
    public boolean hasOlderMessageInConversation(Long conversationId, LocalDateTime createdAt, Long id) {
        if (messageRepository.existsByConversation_IdAndDeletedAtIsNullAndCreatedAtLessThan(conversationId, createdAt)) {
            return true;
        }
        return id != null && messageRepository.existsByConversation_IdAndDeletedAtIsNullAndCreatedAtEqualsAndIdLessThan(
                conversationId,
                createdAt,
                id
        );
    }

    @Override
    public boolean existsOperatorParticipation(UUID customerId, UUID operatorId) {
        return messageRepository.existsByConversation_Customer_IdAndDeletedAtIsNullAndSender_IdAndSenderType(
                customerId,
                operatorId,
                MessageSenderType.OPERATOR
        );
    }

    private List<MessageEntity> findTimelineBeforeCursor(
            UUID customerId,
            Collection<Long> conversationIds,
            LocalDateTime beforeCreatedAt,
            Long beforeId,
            int limit
    ) {
        PageRequest firstPage = PageRequest.of(0, limit);

        List<MessageEntity> sameTimestamp = conversationIds == null
                ? messageRepository.findByConversation_Customer_IdAndDeletedAtIsNullAndCreatedAtEqualsAndIdLessThanOrderByCreatedAtDescIdDesc(
                        customerId,
                        beforeCreatedAt,
                        beforeId,
                        firstPage
                )
                : messageRepository.findByConversation_Customer_IdAndConversation_IdInAndDeletedAtIsNullAndCreatedAtEqualsAndIdLessThanOrderByCreatedAtDescIdDesc(
                        customerId,
                        conversationIds,
                        beforeCreatedAt,
                        beforeId,
                        firstPage
                );
        List<MessageEntity> results = new ArrayList<>(sameTimestamp);

        if (results.size() < limit) {
            PageRequest nextPage = PageRequest.of(0, limit - results.size());
            List<MessageEntity> older = conversationIds == null
                    ? messageRepository.findByConversation_Customer_IdAndDeletedAtIsNullAndCreatedAtLessThanOrderByCreatedAtDescIdDesc(
                            customerId,
                            beforeCreatedAt,
                            nextPage
                    )
                    : messageRepository.findByConversation_Customer_IdAndConversation_IdInAndDeletedAtIsNullAndCreatedAtLessThanOrderByCreatedAtDescIdDesc(
                            customerId,
                            conversationIds,
                            beforeCreatedAt,
                            nextPage
                    );
            results.addAll(older);
        }

        return results;
    }

    private int persistMarkedRead(List<MessageEntity> messages) {
        if (messages.isEmpty()) {
            return 0;
        }

        for (MessageEntity message : messages) {
            message.setRead(true);
            if (message.getReaderCount() == null || message.getReaderCount() < 1) {
                message.setReaderCount(1);
            }
        }
        messageRepository.saveAll(messages);
        return messages.size();
    }
}
