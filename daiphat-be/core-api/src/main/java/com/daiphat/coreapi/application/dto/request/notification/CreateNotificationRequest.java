package com.daiphat.coreapi.application.dto.request.notification;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateNotificationRequest(
        @NotNull(message = "userId không được để trống")
        UUID userId,

        @NotBlank(message = "Tiêu đề thông báo không được để trống")
        @Size(max = 255, message = "Tiêu đề thông báo không vượt quá 255 ký tự")
        String title,

        @NotBlank(message = "Nội dung thông báo không được để trống")
        String content,

        @NotNull(message = "Loại thông báo không được để trống")
        NotificationType type,

        @NotNull(message = "Kênh thông báo không được để trống")
        NotificationChannel channel,

        String referenceId,

        NotificationReferenceType referenceType,

        NotificationStatus status
) {
}
