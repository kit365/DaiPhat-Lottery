package com.daiphat.coreapi.application.port.in.notification;

import com.daiphat.coreapi.domain.model.notifications.NotificationModel;

public interface NotificationServicePort {
    NotificationModel createNotification(NotificationModel notification);

    NotificationModel markAsSent(Long notificationId);

    NotificationModel markAsFailed(Long notificationId);

    void archiveAuthEmailNotification(java.util.UUID userId, String token);
}
