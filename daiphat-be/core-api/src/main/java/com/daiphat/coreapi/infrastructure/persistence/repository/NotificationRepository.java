package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.infrastructure.persistence.entity.notification.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.time.LocalDateTime;
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

    @Modifying
    @Query("""
            update NotificationEntity notification
            set notification.read = true
            where notification.user.id = :userId
              and notification.read = false
              and notification.deletedAt is null
            """)
    int markAllAsReadByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("""
            update NotificationEntity notification
            set notification.deletedAt = :deletedAt
            where notification.user.id = :userId
              and notification.read = true
              and notification.deletedAt is null
            """)
    int softDeleteAllReadByUserId(@Param("userId") UUID userId, @Param("deletedAt") LocalDateTime deletedAt);
}
