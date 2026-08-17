package com.daiphat.coreapi.infrastructure.adapter.out.chat.persistence;

import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.LastMessageFrom;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.ConversationEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.chat.ChatPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.chat.ConversationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ConversationRepositoryAdapter implements ConversationRepositoryPort {

    private static final List<ConversationStatus> OPEN_STATUSES = List.of(
            ConversationStatus.OPEN,
            ConversationStatus.ACTIVE,
            ConversationStatus.WAITING_FOR_OPERATOR,
            ConversationStatus.WAITING_FOR_CUSTOMER
    );

    private final ConversationRepository conversationRepository;
    private final ChatPersistenceMapper chatPersistenceMapper;

    @Override
    public ConversationModel save(ConversationModel conversation) {
        return chatPersistenceMapper.toConversationDomain(
                conversationRepository.save(chatPersistenceMapper.toConversationEntity(conversation))
        );
    }

    @Override
    public Optional<ConversationModel> findById(Long id) {
        return conversationRepository.findById(id)
                .map(chatPersistenceMapper::toConversationDomain);
    }

    @Override
    public Optional<ConversationModel> findByIdForUpdate(Long id) {
        return conversationRepository.findByIdAndDeletedAtIsNull(id)
                .map(chatPersistenceMapper::toConversationDomain);
    }

    @Override
    public List<ConversationModel> findAllForManagement() {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository.findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc()
        );
    }

    @Override
    public List<ConversationModel> findForOperatorManagement(UUID operatorId) {
        // Pool: only customers who explicitly requested staff
        List<ConversationEntity> pool = conversationRepository
                .findByDeletedAtIsNullAndStatusAndAssignedOperatorIsNullOrderByUpdatedAtDescIdDesc(
                        ConversationStatus.WAITING_FOR_OPERATOR
                );
        List<ConversationEntity> assignedToMe = conversationRepository
                .findByDeletedAtIsNullAndStatusNotAndAssignedOperator_IdOrderByUpdatedAtDescIdDesc(
                        ConversationStatus.CLOSED,
                        operatorId
                );
        return chatPersistenceMapper.toConversationDomains(mergeByUpdatedAtDesc(pool, assignedToMe));
    }

    @Override
    public List<ConversationModel> findByStatusAndUpdatedAtBefore(ConversationStatus status, LocalDateTime updatedAt) {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository.findByDeletedAtIsNullAndStatusAndUpdatedAtBefore(status, updatedAt)
        );
    }

    @Override
    public List<ConversationModel> findCustomerSilentSince(LocalDateTime threshold) {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository.findByDeletedAtIsNullAndStatusInAndLastMessageFromInAndLastMessageAtBefore(
                        ConversationModel.CUSTOMER_SILENCE_STATUSES,
                        ConversationModel.STAFF_OR_BOT_LAST_SENDERS,
                        threshold
                )
        );
    }

    @Override
    public List<ConversationModel> findStaffResponseOverdueSince(LocalDateTime threshold) {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository.findByDeletedAtIsNullAndStatusInAndLastMessageFromAndLastMessageAtBefore(
                        ConversationModel.STAFF_RESPONSE_SLA_STATUSES,
                        LastMessageFrom.CUSTOMER,
                        threshold
                )
        );
    }

    @Override
    public List<ConversationModel> findPendingAutoCloseWarning(
            LocalDateTime warningThreshold,
            LocalDateTime closeThreshold
    ) {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository
                        .findByDeletedAtIsNullAndStatusInAndLastMessageFromInAndLastMessageAtBeforeAndLastMessageAtGreaterThanEqualAndAutoCloseWarningSentAtIsNull(
                                ConversationModel.CUSTOMER_SILENCE_STATUSES,
                                ConversationModel.STAFF_OR_BOT_LAST_SENDERS,
                                warningThreshold,
                                closeThreshold
                        )
        );
    }

    @Override
    public Optional<ConversationModel> findLatestOpenByCustomerId(UUID customerId) {
        return conversationRepository
                .findByDeletedAtIsNullAndCustomer_IdAndStatusInOrderByUpdatedAtDescIdDesc(customerId, OPEN_STATUSES)
                .stream()
                .findFirst()
                .map(chatPersistenceMapper::toConversationDomain);
    }

    @Override
    public Optional<ConversationModel> findLatestClosedByCustomerId(UUID customerId) {
        return conversationRepository
                .findByDeletedAtIsNullAndCustomer_IdAndStatusOrderByUpdatedAtDescIdDesc(
                        customerId,
                        ConversationStatus.CLOSED
                )
                .stream()
                .findFirst()
                .map(chatPersistenceMapper::toConversationDomain);
    }

    @Override
    public List<ConversationModel> findByUserId(UUID userId) {
        List<ConversationEntity> asCustomer = conversationRepository
                .findByDeletedAtIsNullAndCustomer_IdOrderByUpdatedAtDescIdDesc(userId);
        List<ConversationEntity> asOperator = conversationRepository
                .findByDeletedAtIsNullAndAssignedOperator_IdOrderByUpdatedAtDescIdDesc(userId);

        return chatPersistenceMapper.toConversationDomains(mergeByUpdatedAtDesc(asCustomer, asOperator));
    }

    @Override
    public List<ConversationModel> findByCustomerId(UUID customerId) {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository.findByDeletedAtIsNullAndCustomer_IdOrderByCreatedAtDescIdDesc(customerId)
        );
    }

    @Override
    public List<ConversationModel> findSpamClosesByCustomerSince(UUID customerId, LocalDateTime since) {
        if (customerId == null || since == null) {
            return List.of();
        }
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository
                        .findByDeletedAtIsNullAndCustomer_IdAndCloseReasonAndClosedAtGreaterThanEqualOrderByClosedAtDescIdDesc(
                                customerId,
                                ConversationCloseReason.SPAM,
                                since
                        )
        );
    }

    @Override
    public Optional<ConversationModel> findPreviousConversation(UUID customerId, LocalDateTime beforeCreatedAt) {
        if (beforeCreatedAt == null) {
            return Optional.empty();
        }
        return conversationRepository
                .findFirstByDeletedAtIsNullAndCustomer_IdAndCreatedAtLessThanOrderByCreatedAtDescIdDesc(
                        customerId,
                        beforeCreatedAt
                )
                .map(chatPersistenceMapper::toConversationDomain);
    }

    @Override
    public long countLiveAssignments(UUID operatorId) {
        if (operatorId == null) {
            return 0L;
        }
        return conversationRepository.countByDeletedAtIsNullAndAssignedOperator_IdAndStatusIn(
                operatorId,
                ConversationModel.LIVE_ASSIGNMENT_STATUSES
        );
    }

    @Override
    public Optional<ConversationModel> findNextWaitingForOperatorForUpdate(Long excludeConversationId) {
        return conversationRepository
                .findWaitingForOperatorQueueForUpdate(excludeConversationId, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(chatPersistenceMapper::toConversationDomain);
    }

    private List<ConversationEntity> mergeByUpdatedAtDesc(
            List<ConversationEntity> first,
            List<ConversationEntity> second
    ) {
        Map<Long, ConversationEntity> merged = new LinkedHashMap<>();
        first.forEach(entity -> merged.putIfAbsent(entity.getId(), entity));
        second.forEach(entity -> merged.putIfAbsent(entity.getId(), entity));

        return merged.values().stream()
                .sorted(UPDATED_AT_DESC_THEN_ID_DESC)
                .toList();
    }

    private static final Comparator<ConversationEntity> UPDATED_AT_DESC_THEN_ID_DESC = Comparator
            .comparing(ConversationEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(ConversationEntity::getId, Comparator.nullsLast(Comparator.reverseOrder()));
}
