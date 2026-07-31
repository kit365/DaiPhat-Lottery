package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.mail.EmailServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class RefundRequestEventListener {

    private static final List<String> REFUND_STAFF_ROLE_CODES = List.of(
            RoleConstants.ADMIN,
            RoleConstants.ROLE_STAFF_OPERATOR
    );

    private final NotificationServicePort notificationService;
    private final EmailServicePort emailService;
    private final UserRepositoryPort userRepositoryPort;

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

        // EMAIL row is delivery-tracking only; customer inbox lists IN_APP notifications.
        if (shouldSendEmail(event)) {
            sendRefundEmail(event, title, content);
        }

        if (shouldNotifyStaff(event)) {
            notifyStaff(event);
        }
    }

    /**
     * Staff need attention when a refund is ready for transfer (customer create / bank submitted).
     */
    private boolean shouldNotifyStaff(RefundRequestStatusChangedEvent event) {
        return event.status() != null && event.status().isAwaitingTransfer();
    }

    private void notifyStaff(RefundRequestStatusChangedEvent event) {
        String title = resolveStaffNotificationTitle(event);
        String content = resolveStaffNotificationContent(event);

        UUID customerId = event.customerId();
        userRepositoryPort.findAllByRoleCodes(REFUND_STAFF_ROLE_CODES).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .filter(user -> user.getId() != null && !Objects.equals(user.getId(), customerId))
                .forEach(user -> {
                    NotificationModel staffNotification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(title)
                            .content(content)
                            .type(NotificationType.ORDER)
                            .channel(NotificationChannel.IN_APP)
                            .referenceId(String.valueOf(event.refundRequestId()))
                            .referenceType(NotificationReferenceType.REFUND_REQUEST)
                            .build();
                    staffNotification.markAsSent();
                    notificationService.createNotification(staffNotification);
                });
    }

    /**
     * Staff-created refunds wait for customer bank info; when READY_TO_PAY the wording
     * should reflect bank submission—not a brand-new customer-initiated request.
     * Only {@link RefundRequestRole#STAFF}; customer-initiated copy stays unchanged.
     */
    private boolean isStaffInitiatedRefund(RefundRequestStatusChangedEvent event) {
        return event.requestRole() == RefundRequestRole.STAFF;
    }

    private String resolveStaffNotificationTitle(RefundRequestStatusChangedEvent event) {
        if (isStaffInitiatedRefund(event)) {
            return "Khách hàng đã cập nhật STK nhận hoàn tiền";
        }
        return "Yêu cầu hoàn tiền mới cần xử lý";
    }

    private String resolveStaffNotificationContent(RefundRequestStatusChangedEvent event) {
        String orderLabel = resolveOrderLabel(event);
        if (isStaffInitiatedRefund(event)) {
            return "Yêu cầu hoàn tiền #" + event.refundRequestId()
                    + " do nhân viên tạo cho đơn hàng #" + orderLabel
                    + " đã được khách hàng cung cấp tài khoản ngân hàng và sẵn sàng để chuyển khoản. "
                    + "Vui lòng kiểm tra và xử lý.";
        }
        return "Đơn hàng #" + orderLabel
                + " có yêu cầu hoàn tiền #" + event.refundRequestId()
                + " đang chờ chuyển khoản. Vui lòng kiểm tra và xử lý.";
    }

    private boolean shouldSendEmail(RefundRequestStatusChangedEvent event) {
        return event.status() == RefundRequestStatus.WAITING_FOR_INFO
                || (event.status() != null && event.status().isAwaitingTransfer())
                || event.status() == RefundRequestStatus.PAID
                || event.status() == RefundRequestStatus.MANUAL_RESOLUTION;
    }

    private void sendRefundEmail(RefundRequestStatusChangedEvent event, String title, String content) {
        UserModel user = userRepositoryPort.findById(event.customerId()).orElse(null);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("Skip refund email for refundId={}: customer email missing", event.refundRequestId());
            return;
        }

        Map<String, Object> emailContext = new HashMap<>();
        emailContext.put("customerName", resolveCustomerName(user));
        emailContext.put("orderCode", resolveOrderLabel(event));
        emailContext.put("title", title);
        emailContext.put("content", content);
        emailContext.put("refundRequestId", event.refundRequestId());
        emailContext.put("isPartialInspectionRefund", isPartialInspectionRefund(event));

        NotificationModel emailNotification = NotificationModel.builder()
                .userId(event.customerId())
                .title(title)
                .content(content)
                .type(NotificationType.ORDER)
                .channel(NotificationChannel.EMAIL)
                .referenceId(String.valueOf(event.refundRequestId()))
                .referenceType(NotificationReferenceType.REFUND_REQUEST)
                .build();
        emailNotification = notificationService.createNotification(emailNotification);

        try {
            emailService.sendEmail(EmailType.REFUND_CUSTOMER_UPDATE, user.getEmail(), emailContext);
            notificationService.markAsSent(emailNotification.getNotificationId());
        } catch (Exception ex) {
            log.error("Failed to send refund email for refundId={}: {}", event.refundRequestId(), ex.getMessage());
            notificationService.markAsFailed(emailNotification.getNotificationId());
        }
    }

    private String resolveCustomerName(UserModel user) {
        String first = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String last = user.getLastName() != null ? user.getLastName().trim() : "";
        String full = (last + " " + first).trim();
        if (!full.isBlank()) {
            return full;
        }
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername();
        }
        return "Quý khách";
    }

    private boolean isPartialInspectionRefund(RefundRequestStatusChangedEvent event) {
        return event.refundType() == RefundType.ORDER_DETAIL
                && event.status() == RefundRequestStatus.WAITING_FOR_INFO
                && event.retryCount() == 0;
    }

    private String resolveTitle(RefundRequestStatusChangedEvent event) {
        if (isPartialInspectionRefund(event)) {
            return "Một số vé trong đơn cần hoàn tiền";
        }
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
        if (isPartialInspectionRefund(event)) {
            return "Đơn hàng #" + orderLabel
                    + " có vé bị sự cố (hư hỏng/thất lạc) và không thể đổi sang vé khác. "
                    + "Hệ thống đã tạo yêu cầu hoàn tiền. Vui lòng cung cấp tài khoản ngân hàng để nhận hoàn tiền. "
                    + "Các vé còn lại trong đơn (nếu có) vẫn sẵn sàng để nhận tại cửa hàng.";
        }
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
