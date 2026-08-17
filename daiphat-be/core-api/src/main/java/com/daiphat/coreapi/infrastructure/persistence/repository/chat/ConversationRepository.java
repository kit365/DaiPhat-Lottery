package com.daiphat.coreapi.infrastructure.persistence.repository.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.LastMessageFrom;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.ConversationEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<ConversationEntity, Long> {

    List<ConversationEntity> findByDeletedAtIsNullAndCustomer_IdAndStatusInOrderByUpdatedAtDescIdDesc(
            UUID customerId,
            Collection<ConversationStatus> statuses
    );

    List<ConversationEntity> findByDeletedAtIsNullAndCustomer_IdOrderByUpdatedAtDescIdDesc(UUID customerId);

    List<ConversationEntity> findByDeletedAtIsNullAndCustomer_IdOrderByCreatedAtDescIdDesc(UUID customerId);

    Optional<ConversationEntity> findFirstByDeletedAtIsNullAndCustomer_IdAndCreatedAtLessThanOrderByCreatedAtDescIdDesc(
            UUID customerId,
            LocalDateTime createdAt
    );

    List<ConversationEntity> findByDeletedAtIsNullAndAssignedOperator_IdOrderByUpdatedAtDescIdDesc(UUID operatorId);

    List<ConversationEntity> findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc();

    List<ConversationEntity> findByDeletedAtIsNullAndAssignedOperatorIsNullOrderByUpdatedAtDescIdDesc();

    List<ConversationEntity> findByDeletedAtIsNullAndStatusNotAndAssignedOperatorIsNullOrderByUpdatedAtDescIdDesc(
            ConversationStatus status
    );

    List<ConversationEntity> findByDeletedAtIsNullAndStatusAndAssignedOperatorIsNullOrderByUpdatedAtDescIdDesc(
            ConversationStatus status
    );

    List<ConversationEntity> findByDeletedAtIsNullAndStatusNotAndAssignedOperator_IdOrderByUpdatedAtDescIdDesc(
            ConversationStatus status,
            UUID operatorId
    );

    List<ConversationEntity> findByDeletedAtIsNullAndCustomer_IdAndStatusOrderByUpdatedAtDescIdDesc(
            UUID customerId,
            ConversationStatus status
    );

    List<ConversationEntity> findByDeletedAtIsNullAndStatusAndUpdatedAtBefore(
            ConversationStatus status,
            LocalDateTime updatedAt
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ConversationEntity> findByIdAndDeletedAtIsNull(Long id);

    long countByDeletedAtIsNullAndAssignedOperator_IdAndStatusIn(
            UUID operatorId,
            Collection<ConversationStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM ConversationEntity c
            WHERE c.deletedAt IS NULL
              AND c.status = com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus.WAITING_FOR_OPERATOR
              AND c.assignedOperator IS NULL
              AND (:excludeId IS NULL OR c.id <> :excludeId)
            ORDER BY c.escalatedAt ASC NULLS LAST, c.id ASC
            """)
    List<ConversationEntity> findWaitingForOperatorQueueForUpdate(
            @Param("excludeId") Long excludeId,
            Pageable pageable
    );

    List<ConversationEntity> findByDeletedAtIsNullAndStatusInAndLastMessageFromInAndLastMessageAtBefore(
            Collection<ConversationStatus> statuses,
            Collection<LastMessageFrom> lastFrom,
            LocalDateTime threshold
    );

    List<ConversationEntity> findByDeletedAtIsNullAndStatusInAndLastMessageFromAndLastMessageAtBefore(
            Collection<ConversationStatus> statuses,
            LastMessageFrom lastMessageFrom,
            LocalDateTime threshold
    );

    List<ConversationEntity> findByDeletedAtIsNullAndStatusInAndLastMessageFromInAndLastMessageAtBeforeAndLastMessageAtGreaterThanEqualAndAutoCloseWarningSentAtIsNull(
            Collection<ConversationStatus> statuses,
            Collection<LastMessageFrom> lastFrom,
            LocalDateTime warningThreshold,
            LocalDateTime closeThreshold
    );

    List<ConversationEntity> findByDeletedAtIsNullAndCustomer_IdAndCloseReasonAndClosedAtGreaterThanEqualOrderByClosedAtDescIdDesc(
            UUID customerId,
            ConversationCloseReason closeReason,
            LocalDateTime closedAt
    );
}
