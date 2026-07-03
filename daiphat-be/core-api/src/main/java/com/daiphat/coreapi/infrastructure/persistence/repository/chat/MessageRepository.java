package com.daiphat.coreapi.infrastructure.persistence.repository.chat;

import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.MessageEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    List<MessageEntity> findByConversation_IdAndDeletedAtIsNullOrderByCreatedAtAscIdAsc(Long conversationId);

    boolean existsByConversation_IdAndDeletedAtIsNullAndSenderType(
            Long conversationId,
            MessageSenderType senderType
    );

    long countByConversation_IdAndDeletedAtIsNullAndSender_IdNot(Long conversationId, UUID senderId);

    long countByConversation_IdAndDeletedAtIsNullAndSenderIsNull(Long conversationId);

    long countByConversation_IdAndDeletedAtIsNullAndSender_IdNotAndCreatedAtAfter(
            Long conversationId,
            UUID senderId,
            LocalDateTime createdAt
    );

    long countByConversation_IdAndDeletedAtIsNullAndSenderIsNullAndCreatedAtAfter(
            Long conversationId,
            LocalDateTime createdAt
    );

    List<MessageEntity> findByConversation_IdAndDeletedAtIsNullAndSenderTypeNotAndIsReadFalseAndCreatedAtLessThanEqual(
            Long conversationId,
            MessageSenderType senderType,
            LocalDateTime readAt
    );

    List<MessageEntity> findByConversation_IdAndDeletedAtIsNullAndSenderTypeNotAndIsReadFalse(
            Long conversationId,
            MessageSenderType senderType
    );

    List<MessageEntity> findByConversation_Customer_IdAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(
            UUID customerId,
            Pageable pageable
    );

    List<MessageEntity> findByConversation_Customer_IdAndConversation_IdInAndDeletedAtIsNullOrderByCreatedAtDescIdDesc(
            UUID customerId,
            Collection<Long> conversationIds,
            Pageable pageable
    );

    List<MessageEntity> findByConversation_Customer_IdAndDeletedAtIsNullAndCreatedAtLessThanOrderByCreatedAtDescIdDesc(
            UUID customerId,
            LocalDateTime beforeCreatedAt,
            Pageable pageable
    );

    List<MessageEntity> findByConversation_Customer_IdAndConversation_IdInAndDeletedAtIsNullAndCreatedAtLessThanOrderByCreatedAtDescIdDesc(
            UUID customerId,
            Collection<Long> conversationIds,
            LocalDateTime beforeCreatedAt,
            Pageable pageable
    );

    List<MessageEntity> findByConversation_Customer_IdAndDeletedAtIsNullAndCreatedAtEqualsAndIdLessThanOrderByCreatedAtDescIdDesc(
            UUID customerId,
            LocalDateTime createdAt,
            Long beforeId,
            Pageable pageable
    );

    List<MessageEntity> findByConversation_Customer_IdAndConversation_IdInAndDeletedAtIsNullAndCreatedAtEqualsAndIdLessThanOrderByCreatedAtDescIdDesc(
            UUID customerId,
            Collection<Long> conversationIds,
            LocalDateTime createdAt,
            Long beforeId,
            Pageable pageable
    );

    List<MessageEntity> findByConversation_Customer_IdAndDeletedAtIsNullAndSender_IdAndSenderType(
            UUID customerId,
            UUID senderId,
            MessageSenderType senderType
    );

    boolean existsByConversation_IdAndDeletedAtIsNullAndCreatedAtLessThan(
            Long conversationId,
            LocalDateTime createdAt
    );

    boolean existsByConversation_IdAndDeletedAtIsNullAndCreatedAtEqualsAndIdLessThan(
            Long conversationId,
            LocalDateTime createdAt,
            Long id
    );

    boolean existsByConversation_Customer_IdAndDeletedAtIsNullAndSender_IdAndSenderType(
            UUID customerId,
            UUID senderId,
            MessageSenderType senderType
    );
}
