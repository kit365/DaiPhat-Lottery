package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepositoryPort {

    ConversationModel save(ConversationModel conversation);

    Optional<ConversationModel> findById(Long id);

    Optional<ConversationModel> findByIdForUpdate(Long id);

    List<ConversationModel> findAllForManagement();

    List<ConversationModel> findForOperatorManagement(UUID operatorId);

    List<ConversationModel> findByStatusAndUpdatedAtBefore(ConversationStatus status, LocalDateTime updatedAt);

    List<ConversationModel> findCustomerSilentSince(LocalDateTime threshold);

    List<ConversationModel> findStaffResponseOverdueSince(LocalDateTime threshold);

    List<ConversationModel> findPendingAutoCloseWarning(
            LocalDateTime warningThreshold,
            LocalDateTime closeThreshold
    );

    Optional<ConversationModel> findLatestOpenByCustomerId(UUID customerId);

    Optional<ConversationModel> findLatestClosedByCustomerId(UUID customerId);

    List<ConversationModel> findByUserId(UUID userId);

    List<ConversationModel> findByCustomerId(UUID customerId);

    Optional<ConversationModel> findPreviousConversation(UUID customerId, LocalDateTime beforeCreatedAt);
}
