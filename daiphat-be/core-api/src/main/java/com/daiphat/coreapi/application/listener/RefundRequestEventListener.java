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

        String title = resolveTitle(event.status());
        String content = resolveContent(event);

        NotificationModel notification = NotificationModel.builder()
                .userId(event.customerId())
                .title(title)
                .content(content)
                .type(NotificationType.ORDER)
                .channel(NotificationChannel.IN_APP)
                .referenceId(String.valueOf(event.refundRequestId()))
                .referenceType(NotificationReferenceType.ORDER)
                .build();
        notification.markAsSent();
        notificationService.createNotification(notification);
    }

    private String resolveTitle(RefundRequestStatus status) {
        return switch (status) {
            case APPROVED -> "Yêu cầu hủy đơn đã được duyệt";
            case REJECTED -> "Yêu cầu hủy đơn bị từ chối";
            case PAID -> "Hoàn tiền đã được chuyển";
            default -> "Cập nhật yêu cầu hoàn tiền";
        };
    }

    private String resolveContent(RefundRequestStatusChangedEvent event) {
        return switch (event.status()) {
            case APPROVED -> "Yêu cầu hủy đơn #" + event.refundRequestId() + " đã được duyệt. "
                    + "Đơn hàng sẽ được hủy và tiền sẽ được hoàn lại.";
            case REJECTED -> {
                String reason = event.rejectReason() != null ? event.rejectReason() : "";
                yield "Yêu cầu hủy đơn #" + event.refundRequestId() + " đã bị từ chối."
                        + (reason.isBlank() ? "" : " Lý do: " + reason);
            }
            case PAID -> "Yêu cầu hoàn tiền #" + event.refundRequestId() + " đã được chuyển khoản thành công.";
            default -> "Yêu cầu hoàn tiền #" + event.refundRequestId() + " đã được cập nhật.";
        };
    }
}
