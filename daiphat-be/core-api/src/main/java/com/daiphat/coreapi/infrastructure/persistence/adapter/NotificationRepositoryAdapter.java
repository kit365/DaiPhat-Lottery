package com.daiphat.coreapi.infrastructure.persistence.adapter;

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
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationRepositoryAdapter implements NotificationRepositoryPort {

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
                .findFirstByUserIdAndChannelAndTypeAndReferenceTypeAndReferenceIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        userId,
                        channel,
                        type,
                        referenceType,
                        referenceId
                )
                .map(notificationPersistenceMapper::toDomain);
    }
}
