package com.daiphat.coreapi.application.service.notification;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.notification.NotificationReferenceAvailabilityResponse;
import com.daiphat.coreapi.application.dto.response.notification.NotificationResponse;
import com.daiphat.coreapi.application.mapper.notification.NotificationApplicationMapper;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.application.port.out.notification.NotificationRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationAudience;
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
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationServicePort {

    private static final String AUTH = "auth";
    private static final String BLOG = "blog";
    private static final String ORDER = "order";
    private static final String SYSTEM = "system";

    private final NotificationRepositoryPort notificationRepositoryPort;
    private final NotificationApplicationMapper notificationApplicationMapper;
    private final OrderRepositoryPort orderRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final SupportTicketRepositoryPort supportTicketRepositoryPort;
    private final BlogPostRepositoryPort blogPostRepositoryPort;

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
        return getNotificationsForUser(userId, page, limit, NotificationAudience.CUSTOMER);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMyAdminNotifications(UUID userId, int page, int limit) {
        return getNotificationsForUser(userId, page, limit, NotificationAudience.STAFF);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationReferenceAvailabilityResponse resolveMyNotificationReference(
            UUID userId,
            Long notificationId
    ) {
        NotificationModel notification = findNotificationOrThrow(notificationId);
        if (!userId.equals(notification.getUserId())) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }

        NotificationReferenceType referenceType = notification.getReferenceType();
        String referenceId = notification.getReferenceId();

        if (referenceType == null) {
            return NotificationReferenceAvailabilityResponse.unavailable(null, referenceId);
        }

        if (referenceType == NotificationReferenceType.AUTH
                || referenceType == NotificationReferenceType.SYSTEM
                || referenceType == NotificationReferenceType.LOTTERY_STATION) {
            return NotificationReferenceAvailabilityResponse.available(referenceType, referenceId);
        }

        if (referenceId == null || referenceId.isBlank()) {
            return NotificationReferenceAvailabilityResponse.unavailable(referenceType, referenceId);
        }

        boolean exists = switch (referenceType) {
            case ORDER -> isOrderReferenceAvailable(referenceId);
            case REFUND, REFUND_REQUEST -> isRefundReferenceAvailable(referenceId);
            case PRIZE_PAYOUT_REQUEST -> isPrizePayoutReferenceAvailable(referenceId);
            case SUPPORT_TICKET -> isSupportTicketReferenceAvailable(referenceId);
            case BLOG_POST -> isBlogPostReferenceAvailable(referenceId);
            default -> true;
        };

        return exists
                ? NotificationReferenceAvailabilityResponse.available(referenceType, referenceId)
                : NotificationReferenceAvailabilityResponse.unavailable(referenceType, referenceId);
    }

    private boolean isOrderReferenceAvailable(String referenceId) {
        // Legacy refund notifications incorrectly used ORDER + numeric refund id.
        if (referenceId.chars().allMatch(Character::isDigit)) {
            return isRefundReferenceAvailable(referenceId);
        }
        try {
            UUID orderId = UUID.fromString(referenceId.trim());
            return orderRepositoryPort.findById(orderId).isPresent();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private boolean isRefundReferenceAvailable(String referenceId) {
        try {
            Long refundId = Long.valueOf(referenceId.trim());
            return refundRequestRepositoryPort.findById(refundId).isPresent();
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private boolean isPrizePayoutReferenceAvailable(String referenceId) {
        try {
            Long requestId = Long.valueOf(referenceId.trim());
            return prizePayoutRequestRepositoryPort.findById(requestId).isPresent();
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private boolean isSupportTicketReferenceAvailable(String referenceId) {
        try {
            Long ticketId = Long.valueOf(referenceId.trim());
            return supportTicketRepositoryPort.findById(ticketId).isPresent();
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private boolean isBlogPostReferenceAvailable(String referenceId) {
        try {
            Long postId = Long.valueOf(referenceId.trim());
            return blogPostRepositoryPort.existsById(postId);
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private PageResponse<NotificationResponse> getNotificationsForUser(
            UUID userId,
            int page,
            int limit,
            NotificationAudience audience
    ) {
        int resolvedPage = Math.max(page, 1);
        int resolvedLimit = Math.max(limit, 1);
        Page<NotificationModel> notificationPage = notificationRepositoryPort.findByUserIdAndAudience(
                userId,
                audience,
                PageableUtils.of(resolvedPage, resolvedLimit, SortUtils.byCreatedAtDesc())
        );

        return PageResponse.from(
                notificationPage.map(notificationApplicationMapper::toResponse),
                resolvedPage,
                resolvedLimit,
                buildCounts(userId, audience)
        );
    }

    private NotificationModel findNotificationOrThrow(Long notificationId) {
        return notificationRepositoryPort.findById(notificationId)
                .orElseThrow(() -> new DomainException(ErrorCode.NOTIFICATION_NOT_FOUND));
    }

    private Map<String, Long> buildCounts(UUID userId, NotificationAudience audience) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, notificationRepositoryPort.countAllByUserIdAndAudience(userId, audience));
        counts.put(StatusCountKeys.UNREAD, notificationRepositoryPort.countUnreadByUserIdAndAudience(userId, audience));
        counts.put(AUTH, notificationRepositoryPort.countByUserIdAndAudienceAndType(userId, audience, NotificationType.AUTH));
        counts.put(BLOG, notificationRepositoryPort.countByUserIdAndAudienceAndType(userId, audience, NotificationType.BLOG));
        counts.put(ORDER, notificationRepositoryPort.countByUserIdAndAudienceAndType(userId, audience, NotificationType.ORDER));
        counts.put(SYSTEM, notificationRepositoryPort.countByUserIdAndAudienceAndType(userId, audience, NotificationType.SYSTEM));
        return counts;
    }
}
