package com.daiphat.coreapi.domain.model.notifications;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingModel {
    private Long notificationSettingId;
    private UUID userId;
    private NotificationChannel channel;
    private NotificationType type;
    @Builder.Default
    private boolean enabled = true;
    private LocalDateTime updatedAt;

    public void enable() {
        this.enabled = true;
        this.updatedAt = LocalDateTime.now();
    }

    public void disable() {
        this.enabled = false;
        this.updatedAt = LocalDateTime.now();
    }

    public void toggle(boolean enabled) {
        this.enabled = enabled;
        this.updatedAt = LocalDateTime.now();
    }
}
