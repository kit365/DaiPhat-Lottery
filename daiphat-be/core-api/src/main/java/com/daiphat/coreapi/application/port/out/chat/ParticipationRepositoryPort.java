package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.ParticipationModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipationRepositoryPort {

    ParticipationModel save(ParticipationModel participation);

    List<ParticipationModel> findByConversationId(Long conversationId);

    Optional<ParticipationModel> findActiveByConversationIdAndUserId(Long conversationId, UUID userId);
}
