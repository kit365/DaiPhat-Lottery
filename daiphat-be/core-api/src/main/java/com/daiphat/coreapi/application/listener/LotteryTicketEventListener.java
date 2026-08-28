package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.daiphat.coreapi.application.event.LotteryTicketProxyExpiredEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationAudience;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryTicketEventListener {

    private static final List<String> PROXY_EXPIRED_NOTIFICATION_ROLE_CODES = List.of(RoleConstants.ADMIN);

    private final UserRepositoryPort userRepositoryPort;
    private final NotificationServicePort notificationService;
    private final FcmPushPort fcmPushPort;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLotteryTicketProxyExpired(LotteryTicketProxyExpiredEvent event) {
        final String title = "Vé giữ hộ đã quá hạn";
        final String content = "Vé số " + event.ticketNumber() + " đang giữ hộ đã quá giờ chốt và được chuyển sang EXPIRED.";

        log.info("Handling LotteryTicketProxyExpiredEvent for ticketId: {}", event.ticketId());

        userRepositoryPort.findAllByRoleCodes(PROXY_EXPIRED_NOTIFICATION_ROLE_CODES).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> {
                    NotificationModel notification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(title)
                            .content(content)
                            .type(NotificationType.SYSTEM)
                            .channel(NotificationChannel.IN_APP)
                            .audience(NotificationAudience.STAFF)
                            .referenceId(String.valueOf(event.ticketId()))
                            .referenceType(NotificationReferenceType.SYSTEM)
                            .build();
                    notification.markAsSent();
                    NotificationModel saved = notificationService.createNotification(notification);
                    sendPushNotification(user, saved);
                });
    }

    private void sendPushNotification(UserModel user, NotificationModel notification) {
        if (user.getFcmToken() == null || user.getFcmToken().trim().isEmpty()) {
            return;
        }

        FcmPushData data = FcmPushData.builder()
                .notificationId(notification.getNotificationId())
                .type(notification.getType() != null ? notification.getType().name() : null)
                .referenceId(notification.getReferenceId())
                .referenceType(notification.getReferenceType() != null ? notification.getReferenceType().name() : null)
                .build();
        fcmPushPort.sendPushNotification(user.getFcmToken(), notification.getTitle(), notification.getContent(), data);
    }
}
