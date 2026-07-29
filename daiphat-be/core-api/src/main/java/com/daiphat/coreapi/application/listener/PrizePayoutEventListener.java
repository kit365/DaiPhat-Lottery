package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.PrizePayoutStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.text.NumberFormat;
import java.util.Locale;

@Component
@RequiredArgsConstructor
@Slf4j
public class PrizePayoutEventListener {

    private final NotificationServicePort notificationService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePrizePayoutStatusChanged(PrizePayoutStatusChangedEvent event) {
        if (event.customerId() == null || event.status() == null) {
            return;
        }

        log.info("Handling PrizePayoutStatusChangedEvent for requestId: {}", event.requestId());

        String title = resolveTitle(event);
        String content = resolveContent(event);

        NotificationModel notification = NotificationModel.builder()
                .userId(event.customerId())
                .title(title)
                .content(content)
                .type(NotificationType.RESULT)
                .channel(NotificationChannel.IN_APP)
                .referenceId(String.valueOf(event.requestId()))
                .referenceType(NotificationReferenceType.PRIZE_PAYOUT_REQUEST)
                .build();
        notification.markAsSent();
        notificationService.createNotification(notification);
    }

    private String resolveTitle(PrizePayoutStatusChangedEvent event) {
        return switch (event.status()) {
            case PENDING -> "Yêu cầu trả thưởng đã gửi";
            case COMPLETED -> "Trả thưởng thành công";
            case REJECTED -> "Yêu cầu trả thưởng bị từ chối";
            case CANCELLED -> "Yêu cầu trả thưởng đã hủy";
        };
    }

    private String resolveContent(PrizePayoutStatusChangedEvent event) {
        String code = event.requestCode() != null ? event.requestCode() : String.valueOf(event.requestId());
        String amount = formatAmount(event.grossAmount());
        return switch (event.status()) {
            case PENDING -> String.format(
                    "Yêu cầu %s (%s) đã được gửi. Vui lòng chờ xử lý 1–3 ngày làm việc.",
                    code,
                    amount);
            case COMPLETED -> String.format(
                    "Yêu cầu %s đã được chuyển khoản %s. Xem chi tiết để tải biên lai.",
                    code,
                    amount);
            case REJECTED -> String.format(
                    "Yêu cầu %s bị từ chối. Lý do: %s. Bạn có thể gửi yêu cầu mới.",
                    code,
                    event.rejectReason() != null ? event.rejectReason() : "Không rõ");
            case CANCELLED -> String.format(
                    "Yêu cầu %s đã được hủy. Vé quay về trạng thái đang giữ hộ.",
                    code);
        };
    }

    private String formatAmount(java.math.BigDecimal amount) {
        if (amount == null) {
            return "—";
        }
        NumberFormat formatter = NumberFormat.getInstance(new Locale("vi", "VN"));
        return formatter.format(amount) + "đ";
    }
}
