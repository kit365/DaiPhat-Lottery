package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.infrastructure.persistence.entity.notification.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    Optional<NotificationEntity> findFirstByUser_IdAndChannelAndTypeAndReferenceTypeAndReferenceIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            UUID userId,
            NotificationChannel channel,
            NotificationType type,
            NotificationReferenceType referenceType,
            String referenceId
    );

    Page<NotificationEntity> findByUser_IdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUser_IdAndDeletedAtIsNull(UUID userId);

    long countByUser_IdAndReadFalseAndDeletedAtIsNull(UUID userId);

    long countByUser_IdAndTypeAndDeletedAtIsNull(UUID userId, NotificationType type);
}
