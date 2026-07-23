package com.daiphat.coreapi.application.dto.request.notification;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import jakarta.validation.constraints.NotNull;

public record UpdateMyNotificationSettingRequest(
        @NotNull(message = "Kênh thông báo không được để trống")
        NotificationChannel channel,

        @NotNull(message = "Loại thông báo không được để trống")
        NotificationType type,

        @NotNull(message = "Trạng thái bật/tắt không được để trống")
        Boolean isEnabled
) {
}
