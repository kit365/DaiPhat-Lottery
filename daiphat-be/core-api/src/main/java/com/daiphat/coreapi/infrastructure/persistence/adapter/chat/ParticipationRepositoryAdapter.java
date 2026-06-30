package com.daiphat.coreapi.infrastructure.persistence.adapter.chat;

import com.daiphat.coreapi.application.port.out.chat.ParticipationRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ParticipationModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.chat.ChatPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.chat.ParticipationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ParticipationRepositoryAdapter implements ParticipationRepositoryPort {

    private final ParticipationRepository participationRepository;
    private final ChatPersistenceMapper chatPersistenceMapper;

    @Override
    public ParticipationModel save(ParticipationModel participation) {
        return chatPersistenceMapper.toParticipationDomain(
                participationRepository.save(chatPersistenceMapper.toParticipationEntity(participation))
        );
    }

    @Override
    public List<ParticipationModel> findByConversationId(Long conversationId) {
        return chatPersistenceMapper.toParticipationDomains(
                participationRepository.findByConversation_IdAndDeletedAtIsNullOrderByJoinedAtAscIdAsc(conversationId)
        );
    }

    @Override
    public Optional<ParticipationModel> findActiveByConversationIdAndUserId(Long conversationId, UUID userId) {
        return participationRepository.findByConversation_IdAndUser_IdAndIsActiveTrueAndDeletedAtIsNull(conversationId, userId)
                .map(chatPersistenceMapper::toParticipationDomain);
    }
}
