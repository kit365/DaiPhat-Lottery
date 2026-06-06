package com.daiphat.coreapi.application.service.notification;

import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.NotificationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Core NotificationService Unit Tests")
class NotificationServiceTest {

    private static final Long NOTIFICATION_ID = 1L;
    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String TOKEN = "verify-token-123";

    private NotificationServicePort notificationService;

    @Mock
    private NotificationRepositoryPort notificationRepositoryPort;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepositoryPort);
    }

    @Test
    void createNotification_success_initializesDefaultFields() {
        NotificationModel request = NotificationModel.builder()
                .userId(USER_ID)
                .title("Email xác thực tài khoản đã được gửi")
                .content("Vui lòng kiểm tra hộp thư của bạn.")
                .type(NotificationType.AUTH)
                .channel(NotificationChannel.EMAIL)
                .referenceId(TOKEN)
                .referenceType(NotificationReferenceType.AUTH)
                .status(null)
                .createdAt(null)
                .build();

        NotificationModel saved = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(USER_ID)
                .title(request.getTitle())
                .content(request.getContent())
                .type(NotificationType.AUTH)
                .channel(NotificationChannel.EMAIL)
                .referenceId(TOKEN)
                .referenceType(NotificationReferenceType.AUTH)
                .status(NotificationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepositoryPort.save(any(NotificationModel.class))).thenReturn(saved);

        NotificationModel result = notificationService.createNotification(request);

        assertThat(result).isNotNull();
        assertThat(result.getNotificationId()).isEqualTo(NOTIFICATION_ID);
        verify(notificationRepositoryPort).save(any(NotificationModel.class));
        assertThat(request.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(request.isRead()).isFalse();
        assertThat(request.getDeletedAt()).isNull();
        assertThat(request.getCreatedAt()).isNotNull();
    }

    @Test
    void markAsSent_success() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .status(NotificationStatus.PENDING)
                .build();
        NotificationModel saved = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .status(NotificationStatus.SENT)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));
        when(notificationRepositoryPort.save(existing)).thenReturn(saved);

        NotificationModel result = notificationService.markAsSent(NOTIFICATION_ID);

        assertThat(existing.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(result.getStatus()).isEqualTo(NotificationStatus.SENT);
    }

    @Test
    void markAsSent_notFound_throwsNotificationNotFound() {
        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsSent(NOTIFICATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);

        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void markAsFailed_success() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .status(NotificationStatus.PENDING)
                .build();
        NotificationModel saved = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .status(NotificationStatus.FAILED)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));
        when(notificationRepositoryPort.save(existing)).thenReturn(saved);

        NotificationModel result = notificationService.markAsFailed(NOTIFICATION_ID);

        assertThat(existing.getStatus()).isEqualTo(NotificationStatus.FAILED);
        assertThat(result.getStatus()).isEqualTo(NotificationStatus.FAILED);
    }

    @Test
    void markAsFailed_notFound_throwsNotificationNotFound() {
        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsFailed(NOTIFICATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);

        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void archiveAuthEmailNotification_success_marksSentReadAndDeleted() {
        NotificationModel notification = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(USER_ID)
                .type(NotificationType.AUTH)
                .channel(NotificationChannel.EMAIL)
                .referenceId(TOKEN)
                .referenceType(NotificationReferenceType.AUTH)
                .status(NotificationStatus.PENDING)
                .build();

        when(notificationRepositoryPort.findLatestByContext(
                eq(USER_ID),
                eq(NotificationChannel.EMAIL),
                eq(NotificationType.AUTH),
                eq(NotificationReferenceType.AUTH),
                eq(TOKEN)
        )).thenReturn(Optional.of(notification));
        when(notificationRepositoryPort.save(notification)).thenReturn(notification);

        notificationService.archiveAuthEmailNotification(USER_ID, TOKEN);

        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(notification.isRead()).isTrue();
        assertThat(notification.getDeletedAt()).isNotNull();
        verify(notificationRepositoryPort).save(notification);
    }

    @Test
    void archiveAuthEmailNotification_notFound_doesNothing() {
        when(notificationRepositoryPort.findLatestByContext(
                eq(USER_ID),
                eq(NotificationChannel.EMAIL),
                eq(NotificationType.AUTH),
                eq(NotificationReferenceType.AUTH),
                eq(TOKEN)
        )).thenReturn(Optional.empty());

        notificationService.archiveAuthEmailNotification(USER_ID, TOKEN);

        verify(notificationRepositoryPort, never()).save(any());
    }
}
