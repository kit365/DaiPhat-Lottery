package com.daiphat.coreapi.application.port.in.notification;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.notification.NotificationReferenceAvailabilityResponse;
import com.daiphat.coreapi.application.dto.response.notification.NotificationResponse;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;

import java.util.UUID;

public interface NotificationServicePort {
    NotificationModel createNotification(NotificationModel notification);

    NotificationModel markAsSent(Long notificationId);

    NotificationModel markAsFailed(Long notificationId);

    NotificationModel markMyNotificationAsRead(UUID userId, Long notificationId);

    void markAllMyNotificationsAsRead(UUID userId);

    NotificationModel deleteMyReadNotification(UUID userId, Long notificationId);

    void deleteAllMyReadNotifications(UUID userId);

    void archiveAuthEmailNotification(UUID userId, String token);

    PageResponse<NotificationResponse> getMyNotifications(UUID userId, int page, int limit);

    PageResponse<NotificationResponse> getMyAdminNotifications(UUID userId, int page, int limit);

    NotificationReferenceAvailabilityResponse resolveMyNotificationReference(UUID userId, Long notificationId);
}
