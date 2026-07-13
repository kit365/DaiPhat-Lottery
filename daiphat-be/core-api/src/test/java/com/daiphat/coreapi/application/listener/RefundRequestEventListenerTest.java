package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefundRequestEventListener — customer refund notification")
class RefundRequestEventListenerTest {

    @Mock
    private NotificationServicePort notificationService;

    @Captor
    private ArgumentCaptor<NotificationModel> notificationCaptor;

    private RefundRequestEventListener listener;

    private final UUID customerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private final UUID orderId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    @BeforeEach
    void setUp() {
        listener = new RefundRequestEventListener(notificationService);
    }

    @Test
    @DisplayName("READY_TO_PAY: creates IN_APP notification with REFUND_REQUEST referenceType and refundRequestId")
    void handleReadyToPay_createsNotificationWithRefundReference() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(42L)
                .customerId(customerId)
                .orderId(orderId)
                .orderCode("ORD-REF-001")
                .status(RefundRequestStatus.READY_TO_PAY)
                .retryCount(0)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        NotificationModel notification = notificationCaptor.getValue();

        assertThat(notification.getUserId()).isEqualTo(customerId);
        assertThat(notification.getType()).isEqualTo(NotificationType.ORDER);
        assertThat(notification.getChannel()).isEqualTo(NotificationChannel.IN_APP);
        assertThat(notification.getReferenceType()).isEqualTo(NotificationReferenceType.REFUND_REQUEST);
        assertThat(notification.getReferenceId()).isEqualTo("42");
        assertThat(notification.getTitle()).isEqualTo("Yêu cầu hoàn tiền chờ chuyển khoản");
        assertThat(notification.getContent()).contains("ORD-REF-001");
        assertThat(notification.getStatus().name()).isEqualTo("SENT");
    }

    @Test
    @DisplayName("skips notification when customerId is missing")
    void handle_skipsWhenCustomerMissing() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(1L)
                .customerId(null)
                .status(RefundRequestStatus.READY_TO_PAY)
                .retryCount(0)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verifyNoInteractions(notificationService);
    }

    @Test
    @DisplayName("skips notification when status is missing")
    void handle_skipsWhenStatusMissing() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(1L)
                .customerId(customerId)
                .status(null)
                .retryCount(0)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, never()).createNotification(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("PAID: notifies customer of successful transfer")
    void handlePaid_notifiesCustomer() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(7L)
                .customerId(customerId)
                .orderCode("ORD-7")
                .status(RefundRequestStatus.PAID)
                .retryCount(0)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        assertThat(notificationCaptor.getValue().getContent()).contains("chuyển khoản thành công");
        assertThat(notificationCaptor.getValue().getReferenceType())
                .isEqualTo(NotificationReferenceType.REFUND_REQUEST);
        assertThat(notificationCaptor.getValue().getReferenceId()).isEqualTo("7");
    }

    @Test
    @DisplayName("WAITING_FOR_INFO with retryCount=0: incident-cancel copy")
    void handleWaitingForInfo_incidentCancelMessage() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(3L)
                .customerId(customerId)
                .orderCode("ORD-3")
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .retryCount(0)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        assertThat(notificationCaptor.getValue().getTitle()).isEqualTo("Cần cung cấp tài khoản nhận hoàn tiền");
        assertThat(notificationCaptor.getValue().getContent()).contains("đã được hủy do sự cố");
    }

    @Test
    @DisplayName("WAITING_FOR_INFO with retryCount>0: invalid bank retry copy")
    void handleWaitingForInfo_retryMessage() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(4L)
                .customerId(customerId)
                .orderCode("ORD-4")
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .retryCount(1)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        assertThat(notificationCaptor.getValue().getTitle()).isEqualTo("Cần cập nhật tài khoản nhận hoàn tiền");
        assertThat(notificationCaptor.getValue().getContent()).contains("không hợp lệ");
    }

    @Test
    @DisplayName("MANUAL_RESOLUTION: notifies customer to visit counter / CSKH")
    void handleManualResolution_notifiesCustomer() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(5L)
                .customerId(customerId)
                .orderCode("ORD-5")
                .status(RefundRequestStatus.MANUAL_RESOLUTION)
                .retryCount(3)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        assertThat(notificationCaptor.getValue().getTitle()).isEqualTo("Yêu cầu hoàn tiền cần hỗ trợ tại quầy");
        assertThat(notificationCaptor.getValue().getContent()).contains("vượt quá số lần cập nhật");
        assertThat(notificationCaptor.getValue().getReferenceType())
                .isEqualTo(NotificationReferenceType.REFUND_REQUEST);
    }
}
