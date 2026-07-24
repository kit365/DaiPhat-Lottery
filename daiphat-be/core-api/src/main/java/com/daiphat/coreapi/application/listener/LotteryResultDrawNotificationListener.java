package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.daiphat.coreapi.application.event.LotteryResultCompletedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationSettingServicePort;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryResultDrawNotificationListener {

    private static final DateTimeFormatter DRAW_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final UserRepositoryPort userRepositoryPort;
    private final NotificationSettingServicePort notificationSettingService;
    private final NotificationServicePort notificationService;
    private final FcmPushPort fcmPushPort;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleLotteryResultCompleted(LotteryResultCompletedEvent event) {
        if (event == null || event.resultId() == null || event.stationId() == null || event.drawDate() == null) {
            return;
        }

        log.info(
                "Handling LotteryResultCompletedEvent for draw notification resultId={} stationId={} drawDate={}",
                event.resultId(),
                event.stationId(),
                event.drawDate()
        );

        String stationName = event.stationName() != null ? event.stationName() : "Đài xổ số";
        String drawDateLabel = event.drawDate().format(DRAW_DATE_FORMAT);

        String title = "Đã có kết quả xổ số " + stationName;
        String content = String.format(
                "Kết quả mở thưởng đài %s ngày %s đã được công bố. Nhấn để xem ngay!",
                stationName,
                drawDateLabel
        );

        List<UserModel> activeUsers = userRepositoryPort.findAll().stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .filter(user -> notificationSettingService.isEnabled(
                        user.getId(),
                        NotificationChannel.IN_APP,
                        NotificationType.DRAW_RESULT
                ))
                .toList();

        for (UserModel user : activeUsers) {
            NotificationModel notification = NotificationModel.builder()
                    .userId(user.getId())
                    .title(title)
                    .content(content)
                    .type(NotificationType.DRAW_RESULT)
                    .channel(NotificationChannel.IN_APP)
                    .referenceId(event.stationId().toString())
                    .referenceType(NotificationReferenceType.LOTTERY_STATION)
                    .build();
            notification.markAsSent();
            NotificationModel saved = notificationService.createNotification(notification);
            sendPushNotification(user, saved);
        }
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
