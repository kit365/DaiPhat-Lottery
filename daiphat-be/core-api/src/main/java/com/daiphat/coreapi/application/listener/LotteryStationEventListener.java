package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.daiphat.coreapi.application.event.LotteryStationDrawReminderEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
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

import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryStationEventListener {

    private static final DateTimeFormatter DRAW_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final UserRepositoryPort userRepositoryPort;
    private final NotificationServicePort notificationService;
    private final FcmPushPort fcmPushPort;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleLotteryStationDrawReminder(LotteryStationDrawReminderEvent event) {
        String stationNames = String.join(", ", event.stationNames());
        final String title = "Sắp khóa sổ đài hôm nay";
        final String content = "⏳ Còn " + event.remainingMinutes() + " phút nữa khóa sổ các đài "
                + stationNames + " lúc " + event.drawTime().format(DRAW_TIME_FORMATTER) + "!";

        log.info("Handling LotteryStationDrawReminderEvent for stationIds: {}", event.stationIds());

        userRepositoryPort.findAll().stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> {
                    NotificationModel notification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(title)
                            .content(content)
                            .type(NotificationType.SYSTEM)
                            .channel(NotificationChannel.IN_APP)
                            .referenceId(null)
                            .referenceType(NotificationReferenceType.LOTTERY_STATION)
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
