package com.daiphat.coreapi.application.dto.request.notification;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import jakarta.validation.constraints.Size;

public record UpdateNotificationRequest(
        @Size(max = 255, message = "Tiêu đề thông báo không vượt quá 255 ký tự")
        String title,

        String content,

        Boolean isRead,

        NotificationType type,

        NotificationChannel channel,

        String referenceId,

        NotificationReferenceType referenceType,

        NotificationStatus status
) {
}
