package com.daiphat.coreapi.domain.model.notifications;

import com.daiphat.coreapi.domain.model.enums.notification.NotificationAudience;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationStatus;
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
public class NotificationModel {
    private Long notificationId;
    private UUID userId;
    private String title;
    private String content;
    @Builder.Default
    private boolean read = false;
    private NotificationType type;
    private NotificationChannel channel;
    private String referenceId;
    private NotificationReferenceType referenceType;
    @Builder.Default
    private NotificationAudience audience = NotificationAudience.CUSTOMER;
    @Builder.Default
    private NotificationStatus status = NotificationStatus.PENDING;
    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;

    public void initializeForCreate() {
        if (this.audience == null) {
            this.audience = NotificationAudience.CUSTOMER;
        }
        if (this.status == null) {
            this.status = NotificationStatus.PENDING;
        }
        this.read = false;
        this.deletedAt = null;
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public void markAsRead() {
        this.read = true;
    }

    public void markAsUnread() {
        this.read = false;
    }

    public void markAsSent() {
        this.status = NotificationStatus.SENT;
    }

    public void markAsFailed() {
        this.status = NotificationStatus.FAILED;
    }

    public void markAsPending() {
        this.status = NotificationStatus.PENDING;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }
}
