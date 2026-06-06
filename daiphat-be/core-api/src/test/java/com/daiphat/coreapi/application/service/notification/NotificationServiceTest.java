package com.daiphat.coreapi.application.service.notification;

import com.daiphat.coreapi.application.dto.response.notification.NotificationResponse;
import com.daiphat.coreapi.application.mapper.notification.NotificationApplicationMapper;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
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

    @Mock
    private NotificationApplicationMapper notificationApplicationMapper;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepositoryPort, notificationApplicationMapper);
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
    void markMyNotificationAsRead_success() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(USER_ID)
                .read(false)
                .status(NotificationStatus.SENT)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));
        when(notificationRepositoryPort.save(existing)).thenReturn(existing);

        NotificationModel result = notificationService.markMyNotificationAsRead(USER_ID, NOTIFICATION_ID);

        assertThat(result.isRead()).isTrue();
        verify(notificationRepositoryPort).save(existing);
    }

    @Test
    void markMyNotificationAsRead_alreadyRead_doesNotSaveAgain() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(USER_ID)
                .read(true)
                .status(NotificationStatus.SENT)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));

        NotificationModel result = notificationService.markMyNotificationAsRead(USER_ID, NOTIFICATION_ID);

        assertThat(result.isRead()).isTrue();
        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void markMyNotificationAsRead_wrongOwner_throwsAccessDenied() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(UUID.fromString("99999999-9999-9999-9999-999999999999"))
                .read(false)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> notificationService.markMyNotificationAsRead(USER_ID, NOTIFICATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void markMyNotificationAsRead_notFound_throwsNotificationNotFound() {
        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markMyNotificationAsRead(USER_ID, NOTIFICATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);

        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void markAllMyNotificationsAsRead_success() {
        when(notificationRepositoryPort.markAllAsReadByUserId(USER_ID)).thenReturn(4);

        notificationService.markAllMyNotificationsAsRead(USER_ID);

        verify(notificationRepositoryPort).markAllAsReadByUserId(USER_ID);
    }

    @Test
    void deleteMyReadNotification_success() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(USER_ID)
                .read(true)
                .status(NotificationStatus.SENT)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));
        when(notificationRepositoryPort.save(existing)).thenReturn(existing);

        NotificationModel result = notificationService.deleteMyReadNotification(USER_ID, NOTIFICATION_ID);

        assertThat(result.isDeleted()).isTrue();
        verify(notificationRepositoryPort).save(existing);
    }

    @Test
    void deleteMyReadNotification_unread_throwsDeleteRequiresRead() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(USER_ID)
                .read(false)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> notificationService.deleteMyReadNotification(USER_ID, NOTIFICATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_DELETE_REQUIRES_READ);

        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void deleteMyReadNotification_wrongOwner_throwsAccessDenied() {
        NotificationModel existing = NotificationModel.builder()
                .notificationId(NOTIFICATION_ID)
                .userId(UUID.fromString("99999999-9999-9999-9999-999999999999"))
                .read(true)
                .build();

        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> notificationService.deleteMyReadNotification(USER_ID, NOTIFICATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);

        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void deleteMyReadNotification_notFound_throwsNotificationNotFound() {
        when(notificationRepositoryPort.findById(NOTIFICATION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.deleteMyReadNotification(USER_ID, NOTIFICATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);

        verify(notificationRepositoryPort, never()).save(any());
    }

    @Test
    void deleteAllMyReadNotifications_success() {
        when(notificationRepositoryPort.softDeleteAllReadByUserId(USER_ID)).thenReturn(3);

        notificationService.deleteAllMyReadNotifications(USER_ID);

        verify(notificationRepositoryPort).softDeleteAllReadByUserId(USER_ID);
    }

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

    @Test
    void getMyNotifications_success_returnsNewestPageWithCounts() {
        NotificationModel newest = NotificationModel.builder()
                .notificationId(2L)
                .userId(USER_ID)
                .title("Bài viết mới đã được đăng")
                .content("Một bài viết mới vừa được xuất bản.")
                .type(NotificationType.BLOG)
                .status(NotificationStatus.SENT)
                .createdAt(LocalDateTime.now())
                .build();
        NotificationModel older = NotificationModel.builder()
                .notificationId(1L)
                .userId(USER_ID)
                .title("Xác thực tài khoản thành công")
                .content("Chào mừng bạn đến với Đại Phát.")
                .type(NotificationType.AUTH)
                .status(NotificationStatus.SENT)
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();

        Page<NotificationModel> notificationPage = new PageImpl<>(List.of(newest, older));

        NotificationResponse newestResponse = NotificationResponse.builder()
                .notificationId(2L)
                .userId(USER_ID)
                .title(newest.getTitle())
                .content(newest.getContent())
                .isRead(false)
                .type(NotificationType.BLOG)
                .status(NotificationStatus.SENT)
                .createdAt(newest.getCreatedAt())
                .build();
        NotificationResponse olderResponse = NotificationResponse.builder()
                .notificationId(1L)
                .userId(USER_ID)
                .title(older.getTitle())
                .content(older.getContent())
                .isRead(true)
                .type(NotificationType.AUTH)
                .status(NotificationStatus.SENT)
                .createdAt(older.getCreatedAt())
                .build();

        when(notificationRepositoryPort.findByUserId(eq(USER_ID), any(Pageable.class))).thenReturn(notificationPage);
        when(notificationRepositoryPort.countAllByUserId(USER_ID)).thenReturn(6L);
        when(notificationRepositoryPort.countUnreadByUserId(USER_ID)).thenReturn(2L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.AUTH)).thenReturn(3L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.BLOG)).thenReturn(2L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.SYSTEM)).thenReturn(1L);
        when(notificationApplicationMapper.toResponse(newest)).thenReturn(newestResponse);
        when(notificationApplicationMapper.toResponse(older)).thenReturn(olderResponse);

        var result = notificationService.getMyNotifications(USER_ID, 1, 4);

        assertThat(result.getRecordList()).hasSize(2);
        assertThat(result.getRecordList().get(0).notificationId()).isEqualTo(2L);
        assertThat(result.getStatusCounts())
                .containsEntry("all", 6L)
                .containsEntry("unread", 2L)
                .containsEntry("auth", 3L)
                .containsEntry("blog", 2L)
                .containsEntry("system", 1L);
        assertThat(result.getPagination().getCurrentPage()).isEqualTo(1);
        assertThat(result.getPagination().getLimit()).isEqualTo(4);
    }

    @Test
    void getMyNotifications_withInvalidPageAndLimit_normalizesToOne() {
        Page<NotificationModel> notificationPage = new PageImpl<>(List.of());

        when(notificationRepositoryPort.findByUserId(eq(USER_ID), any(Pageable.class))).thenReturn(notificationPage);
        when(notificationRepositoryPort.countAllByUserId(USER_ID)).thenReturn(0L);
        when(notificationRepositoryPort.countUnreadByUserId(USER_ID)).thenReturn(0L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.AUTH)).thenReturn(0L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.BLOG)).thenReturn(0L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.SYSTEM)).thenReturn(0L);

        var result = notificationService.getMyNotifications(USER_ID, 0, 0);

        assertThat(result.getPagination().getCurrentPage()).isEqualTo(1);
        assertThat(result.getPagination().getLimit()).isEqualTo(1);
        assertThat(result.getRecordList()).isEmpty();
        assertThat(result.getStatusCounts())
                .containsEntry("all", 0L)
                .containsEntry("unread", 0L);
    }

    @Test
    void getMyAdminNotifications_success_returnsNewestPageWithCounts() {
        NotificationModel newest = NotificationModel.builder()
                .notificationId(5L)
                .userId(USER_ID)
                .title("Bài viết mới dành cho nội bộ")
                .content("Một bài viết mới vừa được xuất bản cho quản trị viên.")
                .type(NotificationType.BLOG)
                .status(NotificationStatus.SENT)
                .createdAt(LocalDateTime.now())
                .build();

        Page<NotificationModel> notificationPage = new PageImpl<>(List.of(newest));
        NotificationResponse newestResponse = NotificationResponse.builder()
                .notificationId(5L)
                .userId(USER_ID)
                .title(newest.getTitle())
                .content(newest.getContent())
                .isRead(false)
                .type(NotificationType.BLOG)
                .status(NotificationStatus.SENT)
                .createdAt(newest.getCreatedAt())
                .build();

        when(notificationRepositoryPort.findByUserId(eq(USER_ID), any(Pageable.class))).thenReturn(notificationPage);
        when(notificationRepositoryPort.countAllByUserId(USER_ID)).thenReturn(9L);
        when(notificationRepositoryPort.countUnreadByUserId(USER_ID)).thenReturn(4L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.AUTH)).thenReturn(2L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.BLOG)).thenReturn(5L);
        when(notificationRepositoryPort.countByUserIdAndType(USER_ID, NotificationType.SYSTEM)).thenReturn(2L);
        when(notificationApplicationMapper.toResponse(newest)).thenReturn(newestResponse);

        var result = notificationService.getMyAdminNotifications(USER_ID, 1, 5);

        assertThat(result.getRecordList()).hasSize(1);
        assertThat(result.getRecordList().get(0).notificationId()).isEqualTo(5L);
        assertThat(result.getStatusCounts())
                .containsEntry("all", 9L)
                .containsEntry("unread", 4L)
                .containsEntry("auth", 2L)
                .containsEntry("blog", 5L)
                .containsEntry("system", 2L);
        assertThat(result.getPagination().getCurrentPage()).isEqualTo(1);
        assertThat(result.getPagination().getLimit()).isEqualTo(5);
    }
}
