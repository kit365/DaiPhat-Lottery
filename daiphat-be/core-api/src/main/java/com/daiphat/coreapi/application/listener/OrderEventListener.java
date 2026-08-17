package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.daiphat.coreapi.application.event.OrderPaidForProcessingEvent;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.OrderPaymentComplaintSubmittedEvent;
import com.daiphat.coreapi.application.service.order.PaymentComplaintReminderConfigService;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
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
public class OrderEventListener {

    private static final List<String> ORDER_PROCESSING_ROLE_CODES = List.of(
            RoleConstants.ADMIN,
            RoleConstants.ROLE_STAFF_OPERATOR
    );

    private final NotificationServicePort notificationService;
    private final UserRepositoryPort userRepositoryPort;
    private final FcmPushPort fcmPushPort;
    private final PaymentComplaintReminderConfigService paymentComplaintReminderConfigService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePaymentComplaintSubmitted(OrderPaymentComplaintSubmittedEvent event) {
        if (!paymentComplaintReminderConfigService.isEnabled()) {
            return;
        }
        final String title = "Có chứng từ thanh toán cần xác minh";
        final String content = "Đơn hàng " + event.orderCode() + " đã quá thời gian thanh toán và khách vừa gửi chứng từ.";
        userRepositoryPort.findAllByRoleCodes(ORDER_PROCESSING_ROLE_CODES).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> {
                    NotificationModel notification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(title)
                            .content(content)
                            .type(NotificationType.ORDER)
                            .channel(NotificationChannel.IN_APP)
                            .referenceId(String.valueOf(event.orderId()))
                            .referenceType(NotificationReferenceType.ORDER)
                            .build();
                    notification.markAsSent();
                    NotificationModel saved = notificationService.createNotification(notification);
                    sendPushNotification(user, saved);
                });
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderPaidForProcessing(OrderPaidForProcessingEvent event) {
        final String title = "Có đơn hàng mới cần xử lý";
        final String content = "Đơn hàng " + event.orderCode() + " đã thanh toán thành công và đang chờ xử lý.";

        log.info("Handling OrderPaidForProcessingEvent for orderId: {}", event.orderId());

        userRepositoryPort.findAllByRoleCodes(ORDER_PROCESSING_ROLE_CODES).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> {
                    NotificationModel notification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(title)
                            .content(content)
                            .type(NotificationType.ORDER)
                            .channel(NotificationChannel.IN_APP)
                            .referenceId(String.valueOf(event.orderId()))
                            .referenceType(NotificationReferenceType.ORDER)
                            .build();
                    notification.markAsSent();
                    NotificationModel saved = notificationService.createNotification(notification);
                    sendPushNotification(user, saved);
                });
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
        if (event.customerId() == null || event.status() == null || event.status() == OrderStatus.PENDING_PAYMENT) {
            return;
        }

        final String title = resolveStatusTitle(event.status());
        final String content = resolveStatusContent(event.orderCode(), event.status());

        log.info("Handling OrderStatusChangedEvent for orderId: {}", event.orderId());

        NotificationModel notification = NotificationModel.builder()
                .userId(event.customerId())
                .title(title)
                .content(content)
                .type(NotificationType.ORDER)
                .channel(NotificationChannel.IN_APP)
                .referenceId(String.valueOf(event.orderId()))
                .referenceType(NotificationReferenceType.ORDER)
                .build();
        notification.markAsSent();
        NotificationModel saved = notificationService.createNotification(notification);
        userRepositoryPort.findById(event.customerId()).ifPresent(user -> sendPushNotification(user, saved));
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

    private String resolveStatusTitle(OrderStatus status) {
        if (status == null) {
            return "Cập nhật đơn hàng";
        }
        return switch (status) {
            case PENDING_PAYMENT -> "Chờ thanh toán";
            case PAYMENT_COMPLAINT_PENDING -> "Đang xác minh thanh toán";
            case PAID -> "Đặt hàng thành công";
            case PREPARING -> "Đang chuẩn bị đơn hàng";
            case PENDING_PICKUP -> "Đơn hàng đã sẵn sàng";
            case COMPLETED -> "Đơn hàng hoàn thành";
            case CANCELLED -> "Đơn hàng đã hủy";
        };
    }

    private String resolveStatusContent(String orderCode, OrderStatus status) {
        if (status == null) {
            return "Đơn hàng " + orderCode + " vừa được cập nhật.";
        }

        return switch (status) {
            case PENDING_PAYMENT -> "Đơn hàng " + orderCode + " đang chờ bạn thanh toán.";
            case PAYMENT_COMPLAINT_PENDING -> "Cửa hàng đang kiểm tra chứng từ thanh toán của đơn " + orderCode + ".";
            case PAID -> "Đặt thành công đơn hàng " + orderCode + ". Cửa hàng đang xử lý vé cho bạn.";
            case PREPARING -> "Đơn hàng " + orderCode + " đang được cửa hàng chuẩn bị.";
            case PENDING_PICKUP -> "Đơn hàng " + orderCode + " đã xử lý xong. Vui lòng đến cửa hàng để nhận vé nhé.";
            case COMPLETED -> "Đơn hàng " + orderCode + " đã hoàn tất. Cảm ơn bạn đã mua vé!";
            case CANCELLED -> "Đơn hàng " + orderCode + " đã bị hủy.";
        };
    }
}
