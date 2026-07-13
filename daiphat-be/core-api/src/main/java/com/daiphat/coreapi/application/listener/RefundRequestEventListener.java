package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class RefundRequestEventListener {

    private final NotificationServicePort notificationService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleRefundRequestStatusChanged(RefundRequestStatusChangedEvent event) {
        if (event.customerId() == null || event.status() == null) {
            return;
        }

        log.info("Handling RefundRequestStatusChangedEvent for refundId: {}", event.refundRequestId());

        String title = resolveTitle(event);
        String content = resolveContent(event);

        NotificationModel notification = NotificationModel.builder()
                .userId(event.customerId())
                .title(title)
                .content(content)
                .type(NotificationType.ORDER)
                .channel(NotificationChannel.IN_APP)
                .referenceId(String.valueOf(event.refundRequestId()))
                .referenceType(NotificationReferenceType.REFUND_REQUEST)
                .build();
        notification.markAsSent();
        notificationService.createNotification(notification);
    }

    private String resolveTitle(RefundRequestStatusChangedEvent event) {
        return switch (event.status()) {
            case WAITING_FOR_INFO -> event.retryCount() > 0
                    ? "Cần cập nhật tài khoản nhận hoàn tiền"
                    : "Cần cung cấp tài khoản nhận hoàn tiền";
            case APPROVED, READY_TO_PAY -> "Yêu cầu hoàn tiền chờ chuyển khoản";
            case PAID -> "Hoàn tiền đã được chuyển";
            case MANUAL_RESOLUTION -> "Yêu cầu hoàn tiền cần hỗ trợ tại quầy";
            default -> "Cập nhật yêu cầu hoàn tiền";
        };
    }

    private String resolveContent(RefundRequestStatusChangedEvent event) {
        String orderLabel = resolveOrderLabel(event);
        return switch (event.status()) {
            case WAITING_FOR_INFO -> event.retryCount() > 0
                    ? "Yêu cầu hoàn tiền cho đơn hàng #" + orderLabel
                    + " chưa thể chuyển khoản do thông tin tài khoản ngân hàng không hợp lệ. "
                    + "Vui lòng cập nhật tài khoản và gửi lại yêu cầu."
                    : "Đơn hàng #" + orderLabel
                    + " đã được hủy do sự cố. Vui lòng cung cấp tài khoản ngân hàng để nhận hoàn tiền.";
            case APPROVED, READY_TO_PAY -> "Yêu cầu hoàn tiền cho đơn hàng #" + orderLabel
                    + " đang chờ chuyển khoản.";
            case PAID -> "Yêu cầu hoàn tiền cho đơn hàng #" + orderLabel
                    + " đã được chuyển khoản thành công.";
            case MANUAL_RESOLUTION -> "Yêu cầu hoàn tiền cho đơn hàng #" + orderLabel
                    + " đã vượt quá số lần cập nhật tài khoản. "
                    + "Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ CSKH để được hỗ trợ.";
            default -> "Yêu cầu hoàn tiền cho đơn hàng #" + orderLabel + " đã được cập nhật.";
        };
    }

    private String resolveOrderLabel(RefundRequestStatusChangedEvent event) {
        if (event.orderCode() != null && !event.orderCode().isBlank()) {
            return event.orderCode().trim();
        }
        if (event.orderId() != null) {
            return event.orderId().toString();
        }
        return String.valueOf(event.refundRequestId());
    }
}
