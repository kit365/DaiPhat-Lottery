package com.daiphat.coreapi.infrastructure.adapter.out.notification.persistence;

import com.daiphat.coreapi.application.port.out.notification.NotificationRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.notification.NotificationPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.NotificationRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationRepositoryAdapter implements NotificationRepositoryPort {

    /** Customer inbox / badge counts only surface in-app rows; EMAIL rows track mail delivery. */
    private static final NotificationChannel INBOX_CHANNEL = NotificationChannel.IN_APP;

    private final NotificationRepository notificationRepository;
    private final NotificationPersistenceMapper notificationPersistenceMapper;
    private final EntityManager entityManager;

    @Override
    public NotificationModel save(NotificationModel notification) {
        var entity = notificationPersistenceMapper.toEntity(notification);
        entity.setUser(entityManager.getReference(UserEntity.class, notification.getUserId()));
        var savedEntity = notificationRepository.save(entity);
        return notificationPersistenceMapper.toDomain(savedEntity);
    }

    @Override
    public Optional<NotificationModel> findById(Long notificationId) {
        return notificationRepository.findById(notificationId)
                .map(notificationPersistenceMapper::toDomain);
    }

    @Override
    public Optional<NotificationModel> findLatestByContext(
            UUID userId,
            NotificationChannel channel,
            NotificationType type,
            NotificationReferenceType referenceType,
            String referenceId
    ) {
        return notificationRepository
                .findFirstByUser_IdAndChannelAndTypeAndReferenceTypeAndReferenceIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        userId,
                        channel,
                        type,
                        referenceType,
                        referenceId
                )
                .map(notificationPersistenceMapper::toDomain);
    }

    @Override
    public Page<NotificationModel> findByUserId(UUID userId, Pageable pageable) {
        return notificationRepository
                .findByUser_IdAndChannelAndDeletedAtIsNullOrderByCreatedAtDesc(userId, INBOX_CHANNEL, pageable)
                .map(notificationPersistenceMapper::toDomain);
    }

    @Override
    public long countAllByUserId(UUID userId) {
        return notificationRepository.countByUser_IdAndChannelAndDeletedAtIsNull(userId, INBOX_CHANNEL);
    }

    @Override
    public long countUnreadByUserId(UUID userId) {
        return notificationRepository.countByUser_IdAndChannelAndReadFalseAndDeletedAtIsNull(
                userId, INBOX_CHANNEL);
    }

    @Override
    public long countByUserIdAndType(UUID userId, NotificationType type) {
        return notificationRepository.countByUser_IdAndChannelAndTypeAndDeletedAtIsNull(
                userId, INBOX_CHANNEL, type);
    }

    @Override
    public int markAllAsReadByUserId(UUID userId) {
        return notificationRepository.markAllAsReadByUserIdAndChannel(userId, INBOX_CHANNEL);
    }

    @Override
    public int softDeleteAllReadByUserId(UUID userId) {
        return notificationRepository.softDeleteAllReadByUserIdAndChannel(
                userId, INBOX_CHANNEL, LocalDateTime.now());
    }
}
