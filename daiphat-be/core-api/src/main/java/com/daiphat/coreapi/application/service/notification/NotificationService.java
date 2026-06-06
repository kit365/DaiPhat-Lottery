package com.daiphat.coreapi.application.service.notification;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.notification.NotificationResponse;
import com.daiphat.coreapi.application.mapper.notification.NotificationApplicationMapper;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.NotificationRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationServicePort {

    private static final String AUTH = "auth";
    private static final String BLOG = "blog";
    private static final String SYSTEM = "system";

    private final NotificationRepositoryPort notificationRepositoryPort;
    private final NotificationApplicationMapper notificationApplicationMapper;

    @Override
    @Transactional
    public NotificationModel createNotification(NotificationModel notification) {
        notification.initializeForCreate();
        return notificationRepositoryPort.save(notification);
    }

    @Override
    @Transactional
    public NotificationModel markAsSent(Long notificationId) {
        NotificationModel notification = findNotificationOrThrow(notificationId);
        notification.markAsSent();
        return notificationRepositoryPort.save(notification);
    }

    @Override
    @Transactional
    public NotificationModel markAsFailed(Long notificationId) {
        NotificationModel notification = findNotificationOrThrow(notificationId);
        notification.markAsFailed();
        return notificationRepositoryPort.save(notification);
    }

    @Override
    @Transactional
    public NotificationModel markMyNotificationAsRead(UUID userId, Long notificationId) {
        NotificationModel notification = findNotificationOrThrow(notificationId);

        if (!userId.equals(notification.getUserId())) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }

        if (!notification.isRead()) {
            notification.markAsRead();
            return notificationRepositoryPort.save(notification);
        }

        return notification;
    }

    @Override
    @Transactional
    public void markAllMyNotificationsAsRead(UUID userId) {
        notificationRepositoryPort.markAllAsReadByUserId(userId);
    }

    @Override
    @Transactional
    public NotificationModel deleteMyReadNotification(UUID userId, Long notificationId) {
        NotificationModel notification = findNotificationOrThrow(notificationId);

        if (!userId.equals(notification.getUserId())) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }

        if (!notification.isRead()) {
            throw new DomainException(ErrorCode.NOTIFICATION_DELETE_REQUIRES_READ);
        }

        if (!notification.isDeleted()) {
            notification.softDelete();
            return notificationRepositoryPort.save(notification);
        }

        return notification;
    }

    @Override
    @Transactional
    public void deleteAllMyReadNotifications(UUID userId) {
        notificationRepositoryPort.softDeleteAllReadByUserId(userId);
    }

    @Override
    @Transactional
    public void archiveAuthEmailNotification(UUID userId, String token) {
        notificationRepositoryPort.findLatestByContext(
                        userId,
                        NotificationChannel.EMAIL,
                        NotificationType.AUTH,
                        NotificationReferenceType.AUTH,
                        token
                )
                .ifPresent(notification -> {
                    notification.markAsSent();
                    notification.markAsRead();
                    notification.softDelete();
                    notificationRepositoryPort.save(notification);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMyNotifications(UUID userId, int page, int limit) {
        return getNotificationsForUser(userId, page, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMyAdminNotifications(UUID userId, int page, int limit) {
        return getNotificationsForUser(userId, page, limit);
    }

    private PageResponse<NotificationResponse> getNotificationsForUser(UUID userId, int page, int limit) {
        int resolvedPage = Math.max(page, 1);
        int resolvedLimit = Math.max(limit, 1);
        Page<NotificationModel> notificationPage = notificationRepositoryPort.findByUserId(
                userId,
                PageableUtils.of(resolvedPage, resolvedLimit, SortUtils.byCreatedAtDesc())
        );

        List<NotificationResponse> recordList = notificationPage.getContent().stream()
                .map(notificationApplicationMapper::toResponse)
                .toList();

        return PageResponse.<NotificationResponse>builder()
                .recordList(recordList)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(notificationPage.getTotalElements())
                        .totalPages(notificationPage.getTotalPages())
                        .currentPage(resolvedPage)
                        .limit(resolvedLimit)
                        .isFirst(notificationPage.isFirst())
                        .isLast(notificationPage.isLast())
                        .build())
                .statusCounts(buildCounts(userId))
                .build();
    }

    private NotificationModel findNotificationOrThrow(Long notificationId) {
        return notificationRepositoryPort.findById(notificationId)
                .orElseThrow(() -> new DomainException(ErrorCode.NOTIFICATION_NOT_FOUND));
    }

    private Map<String, Long> buildCounts(UUID userId) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, notificationRepositoryPort.countAllByUserId(userId));
        counts.put(StatusCountKeys.UNREAD, notificationRepositoryPort.countUnreadByUserId(userId));
        counts.put(AUTH, notificationRepositoryPort.countByUserIdAndType(userId, NotificationType.AUTH));
        counts.put(BLOG, notificationRepositoryPort.countByUserIdAndType(userId, NotificationType.BLOG));
        counts.put(SYSTEM, notificationRepositoryPort.countByUserIdAndType(userId, NotificationType.SYSTEM));
        return counts;
    }
}
