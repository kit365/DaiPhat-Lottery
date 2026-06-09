package com.daiphat.coreapi.application.dto.response.notification;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record NotificationSettingResponse(
        Long notificationSettingId,
        UUID userId,
        NotificationChannel channel,
        NotificationType type,
        boolean isEnabled,
        LocalDateTime updatedAt
) {
}
