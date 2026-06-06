package com.daiphat.coreapi.application.service.notification;

import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.NotificationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationServicePort {

    private final NotificationRepositoryPort notificationRepositoryPort;

    @Override
    @Transactional
    public NotificationModel createNotification(NotificationModel notification) {
        notification.initializeForCreate();
        return notificationRepositoryPort.save(notification);
    }

    @Override
    @Transactional
    public NotificationModel markAsSent(Long notificationId) {
        NotificationModel notification = findNotificationOrThrow(notificationId);
        notification.markAsSent();
        return notificationRepositoryPort.save(notification);
    }

    @Override
    @Transactional
    public NotificationModel markAsFailed(Long notificationId) {
        NotificationModel notification = findNotificationOrThrow(notificationId);
        notification.markAsFailed();
        return notificationRepositoryPort.save(notification);
    }

    @Override
    @Transactional
    public void archiveAuthEmailNotification(UUID userId, String token) {
        notificationRepositoryPort.findLatestByContext(
                        userId,
                        NotificationChannel.EMAIL,
                        NotificationType.AUTH,
                        NotificationReferenceType.AUTH,
                        token
                )
                .ifPresent(notification -> {
                    notification.markAsSent();
                    notification.markAsRead();
                    notification.softDelete();
                    notificationRepositoryPort.save(notification);
                });
    }

    private NotificationModel findNotificationOrThrow(Long notificationId) {
        return notificationRepositoryPort.findById(notificationId)
                .orElseThrow(() -> new DomainException(ErrorCode.NOTIFICATION_NOT_FOUND));
    }
}
