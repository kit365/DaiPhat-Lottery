package com.daiphat.coreapi.infrastructure.persistence.repository.chat;

import com.daiphat.coreapi.infrastructure.persistence.entity.chat.ParticipationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipationRepository extends JpaRepository<ParticipationEntity, Long> {

    List<ParticipationEntity> findByConversation_IdAndDeletedAtIsNullOrderByJoinedAtAscIdAsc(Long conversationId);

    Optional<ParticipationEntity> findByConversation_IdAndUser_IdAndIsActiveTrueAndDeletedAtIsNull(Long conversationId, UUID userId);
}
