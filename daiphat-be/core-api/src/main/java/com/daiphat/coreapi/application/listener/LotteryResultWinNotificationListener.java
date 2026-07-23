package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.daiphat.coreapi.application.event.LotteryResultCompletedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationSettingServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.notification.NotificationRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.domain.service.lottery.TicketPrizeMatcher;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class LotteryResultWinNotificationListener {

    private static final Set<OrderStatus> ELIGIBLE_ORDER_STATUSES = EnumSet.of(
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.PENDING_PICKUP,
            OrderStatus.COMPLETED
    );

    private static final DateTimeFormatter DRAW_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final OrderDetailRepository orderDetailRepository;
    private final LotteryResultDetailRepositoryPort lotteryResultDetailRepositoryPort;
    private final NotificationSettingServicePort notificationSettingService;
    private final NotificationServicePort notificationService;
    private final NotificationRepositoryPort notificationRepositoryPort;
    private final UserRepositoryPort userRepositoryPort;
    private final FcmPushPort fcmPushPort;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleLotteryResultCompleted(LotteryResultCompletedEvent event) {
        if (event == null || event.resultId() == null || event.stationId() == null || event.drawDate() == null) {
            return;
        }

        log.info(
                "Handling LotteryResultCompletedEvent resultId={} stationId={} drawDate={}",
                event.resultId(),
                event.stationId(),
                event.drawDate()
        );

        List<LotteryResultDetailModel> resultDetails =
                lotteryResultDetailRepositoryPort.findByLotteryResultId(event.resultId());
        if (resultDetails.isEmpty()) {
            return;
        }

        List<OrderDetailEntity> tickets = orderDetailRepository.findEligibleTicketsForDraw(
                event.stationId(),
                event.drawDate(),
                ELIGIBLE_ORDER_STATUSES
        );

        for (OrderDetailEntity detail : tickets) {
            notifyIfWon(detail, resultDetails, event);
        }
    }

    private void notifyIfWon(
            OrderDetailEntity detail,
            List<LotteryResultDetailModel> resultDetails,
            LotteryResultCompletedEvent event
    ) {
        OrderEntity order = detail.getOrder();
        if (order == null || order.getUser() == null || order.getUser().getId() == null) {
            return;
        }
        if (detail.getLotteryTicketSerial() == null || detail.getLotteryTicketSerial().getTicket() == null) {
            return;
        }

        LotteryTicketEntity ticket = detail.getLotteryTicketSerial().getTicket();
        Optional<TicketPrizeMatcher.MatchResult> match =
                TicketPrizeMatcher.findFirstMatch(ticket.getNumbers(), resultDetails);
        if (match.isEmpty()) {
            return;
        }

        UUID userId = order.getUser().getId();
        if (!notificationSettingService.isEnabled(userId, NotificationChannel.IN_APP, NotificationType.RESULT)) {
            log.debug("Skip RESULT win notification for user {} (disabled)", userId);
            return;
        }

        String referenceId = order.getId().toString();
        boolean alreadyNotified = notificationRepositoryPort
                .findLatestByContext(
                        userId,
                        NotificationChannel.IN_APP,
                        NotificationType.RESULT,
                        NotificationReferenceType.ORDER,
                        referenceId
                )
                .isPresent();
        if (alreadyNotified) {
            return;
        }

        String stationName = event.stationName() != null
                ? event.stationName()
                : (ticket.getStation() != null ? ticket.getStation().getName() : "Đài xổ số");
        String drawDateLabel = event.drawDate().format(DRAW_DATE_FORMAT);
        String prizeName = match.get().prizeDisplayName() != null
                ? match.get().prizeDisplayName()
                : match.get().prizeCode();

        String title = "Chúc mừng! Vé của bạn đã trúng thưởng";
        String content = String.format(
                "Vé số %s đài %s ngày %s đã trúng %s. Xem chi tiết đơn hàng %s.",
                ticket.getNumbers(),
                stationName,
                drawDateLabel,
                prizeName,
                order.getOrderCode()
        );

        NotificationModel notification = NotificationModel.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .type(NotificationType.RESULT)
                .channel(NotificationChannel.IN_APP)
                .referenceId(referenceId)
                .referenceType(NotificationReferenceType.ORDER)
                .build();
        notification.markAsSent();
        NotificationModel saved = notificationService.createNotification(notification);

        userRepositoryPort.findById(userId).ifPresent(user -> sendPushNotification(user, saved));
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
