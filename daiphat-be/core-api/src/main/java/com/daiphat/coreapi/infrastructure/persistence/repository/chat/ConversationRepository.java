package com.daiphat.coreapi.infrastructure.persistence.repository.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<ConversationEntity, Long> {

    @Query("""
            select c
            from ConversationEntity c
            join ParticipationEntity p on p.conversation.id = c.id
            where c.deletedAt is null
              and p.deletedAt is null
              and p.isActive = true
              and p.user.id = :userId
              and c.status in :statuses
            order by c.updatedAt desc, c.id desc
            """)
    java.util.List<ConversationEntity> findOpenConversationsByParticipant(
            UUID userId,
            Collection<ConversationStatus> statuses
    );

    @Query("""
            select c
            from ConversationEntity c
            join ParticipationEntity p on p.conversation.id = c.id
            where c.deletedAt is null
              and p.deletedAt is null
              and p.isActive = true
              and p.user.id = :userId
            order by c.updatedAt desc, c.id desc
            """)
    List<ConversationEntity> findConversationsByParticipant(UUID userId);

    @EntityGraph(attributePaths = "participants")
    List<ConversationEntity> findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc();
}
