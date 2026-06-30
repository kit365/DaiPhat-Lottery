package com.daiphat.coreapi.infrastructure.persistence.adapter.chat;

import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.infrastructure.persistence.mapper.chat.ChatPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.chat.ConversationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
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
    public List<ConversationModel> findAllForManagement() {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository.findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc()
        );
    }

    @Override
    public Optional<ConversationModel> findLatestOpenByParticipantUserId(UUID userId) {
        return conversationRepository.findOpenConversationsByParticipant(userId, OPEN_STATUSES).stream()
                .findFirst()
                .map(chatPersistenceMapper::toConversationDomain);
    }

    @Override
    public List<ConversationModel> findByParticipantUserId(UUID userId) {
        return chatPersistenceMapper.toConversationDomains(
                conversationRepository.findConversationsByParticipant(userId)
        );
    }
}
