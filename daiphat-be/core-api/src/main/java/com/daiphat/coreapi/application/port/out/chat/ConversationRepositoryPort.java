package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepositoryPort {

    ConversationModel save(ConversationModel conversation);

    Optional<ConversationModel> findById(Long id);

    List<ConversationModel> findAllForManagement();

    Optional<ConversationModel> findLatestOpenByParticipantUserId(UUID userId);

    List<ConversationModel> findByParticipantUserId(UUID userId);
}
