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
    @DisplayName("PENDING: creates IN_APP notification with REFUND_REQUEST referenceType and refundRequestId")
    void handlePending_createsNotificationWithRefundReference() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(42L)
                .customerId(customerId)
                .orderId(orderId)
                .orderCode("ORD-REF-001")
                .status(RefundRequestStatus.PENDING)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        NotificationModel notification = notificationCaptor.getValue();

        assertThat(notification.getUserId()).isEqualTo(customerId);
        assertThat(notification.getType()).isEqualTo(NotificationType.ORDER);
        assertThat(notification.getChannel()).isEqualTo(NotificationChannel.IN_APP);
        assertThat(notification.getReferenceType()).isEqualTo(NotificationReferenceType.REFUND_REQUEST);
        assertThat(notification.getReferenceId()).isEqualTo("42");
        assertThat(notification.getTitle()).isEqualTo("Yêu cầu hoàn tiền đã được gửi");
        assertThat(notification.getContent()).contains("ORD-REF-001");
        assertThat(notification.getStatus().name()).isEqualTo("SENT");
    }

    @Test
    @DisplayName("skips notification when customerId is missing")
    void handle_skipsWhenCustomerMissing() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(1L)
                .customerId(null)
                .status(RefundRequestStatus.PENDING)
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
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, never()).createNotification(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("REJECTED: includes reject reason in content")
    void handleRejected_includesReason() {
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(7L)
                .customerId(customerId)
                .orderCode("ORD-7")
                .status(RefundRequestStatus.REJECTED)
                .rejectReason("Không đủ điều kiện")
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        assertThat(notificationCaptor.getValue().getContent()).contains("Không đủ điều kiện");
        assertThat(notificationCaptor.getValue().getReferenceType())
                .isEqualTo(NotificationReferenceType.REFUND_REQUEST);
        assertThat(notificationCaptor.getValue().getReferenceId()).isEqualTo("7");
    }
}
