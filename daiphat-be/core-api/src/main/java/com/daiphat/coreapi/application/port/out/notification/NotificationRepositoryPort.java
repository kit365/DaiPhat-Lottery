package com.daiphat.coreapi.application.port.out.notification;

import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface NotificationRepositoryPort {
    NotificationModel save(NotificationModel notification);

    Optional<NotificationModel> findById(Long notificationId);

    Optional<NotificationModel> findLatestByContext(
            UUID userId,
            NotificationChannel channel,
            NotificationType type,
            NotificationReferenceType referenceType,
            String referenceId
    );

    Page<NotificationModel> findByUserId(UUID userId, Pageable pageable);

    long countAllByUserId(UUID userId);

    long countUnreadByUserId(UUID userId);

    long countByUserIdAndType(UUID userId, NotificationType type);

    int markAllAsReadByUserId(UUID userId);

    int softDeleteAllReadByUserId(UUID userId);
}
