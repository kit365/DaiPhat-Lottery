package com.daiphat.coreapi.application.dto.response.notification;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record NotificationResponse(
        Long notificationId,
        UUID userId,
        String title,
        String content,
        boolean isRead,
        NotificationType type,
        NotificationChannel channel,
        String referenceId,
        NotificationReferenceType referenceType,
        NotificationStatus status,
        LocalDateTime createdAt,
        LocalDateTime deletedAt
) {
}
