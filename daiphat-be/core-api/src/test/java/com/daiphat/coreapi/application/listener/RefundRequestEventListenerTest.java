package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.mail.EmailServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefundRequestEventListener — customer refund notification")
class RefundRequestEventListenerTest {

    @Mock
    private NotificationServicePort notificationService;
    @Mock
    private EmailServicePort emailService;
    @Mock
    private UserRepositoryPort userRepositoryPort;

    @Captor
    private ArgumentCaptor<NotificationModel> notificationCaptor;
    @Captor
    private ArgumentCaptor<Map<String, Object>> emailContextCaptor;

    private RefundRequestEventListener listener;

    private final UUID customerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private final UUID orderId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    @BeforeEach
    void setUp() {
        listener = new RefundRequestEventListener(notificationService, emailService, userRepositoryPort);
        org.mockito.Mockito.lenient().when(notificationService.createNotification(any())).thenAnswer(inv -> {
            NotificationModel n = inv.getArgument(0);
            if (n.getNotificationId() == null) {
                n.setNotificationId(100L);
            }
            return n;
        });
    }

    private void stubCustomerEmail() {
        when(userRepositoryPort.findById(customerId)).thenReturn(Optional.of(
                UserModel.builder()
                        .id(customerId)
                        .email("member@daiphat.com")
                        .firstName("Default")
                        .lastName("Member")
                        .build()));
    }

    @Test
    @DisplayName("READY_TO_PAY: creates IN_APP notification with REFUND_REQUEST referenceType and refundRequestId")
    void handleReadyToPay_createsNotificationWithRefundReference() {
        stubCustomerEmail();
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(42L)
                .customerId(customerId)
                .orderId(orderId)
                .orderCode("ORD-REF-001")
                .status(RefundRequestStatus.READY_TO_PAY)
                .retryCount(0)
                .refundType(RefundType.FULL_ORDER)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, org.mockito.Mockito.atLeastOnce()).createNotification(notificationCaptor.capture());
        NotificationModel notification = notificationCaptor.getAllValues().stream()
                .filter(n -> n.getChannel() == NotificationChannel.IN_APP)
                .findFirst()
                .orElseThrow();

        assertThat(notification.getUserId()).isEqualTo(customerId);
        assertThat(notification.getType()).isEqualTo(NotificationType.ORDER);
        assertThat(notification.getChannel()).isEqualTo(NotificationChannel.IN_APP);
        assertThat(notification.getReferenceType()).isEqualTo(NotificationReferenceType.REFUND_REQUEST);
        assertThat(notification.getReferenceId()).isEqualTo("42");
        assertThat(notification.getTitle()).isEqualTo("Yêu cầu hoàn tiền chờ chuyển khoản");
        assertThat(notification.getContent()).contains("ORD-REF-001");
        assertThat(notification.getStatus().name()).isEqualTo("SENT");
        verify(emailService).sendEmail(eq(EmailType.REFUND_CUSTOMER_UPDATE), eq("member@daiphat.com"), any(Map.class));
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
        verifyNoInteractions(emailService);
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

        verify(notificationService, never()).createNotification(any());
        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("PAID: notifies customer of successful transfer")
    void handlePaid_notifiesCustomer() {
        stubCustomerEmail();
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(7L)
                .customerId(customerId)
                .orderCode("ORD-7")
                .status(RefundRequestStatus.PAID)
                .retryCount(0)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, org.mockito.Mockito.atLeastOnce()).createNotification(notificationCaptor.capture());
        NotificationModel inApp = notificationCaptor.getAllValues().stream()
                .filter(n -> n.getChannel() == NotificationChannel.IN_APP)
                .findFirst()
                .orElseThrow();
        assertThat(inApp.getContent()).contains("chuyển khoản thành công");
        assertThat(inApp.getReferenceType()).isEqualTo(NotificationReferenceType.REFUND_REQUEST);
        assertThat(inApp.getReferenceId()).isEqualTo("7");
    }

    @Test
    @DisplayName("WAITING_FOR_INFO ORDER_DETAIL: inspection partial-refund copy + email")
    void handleWaitingForInfo_partialInspectionMessage() {
        stubCustomerEmail();
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(3L)
                .customerId(customerId)
                .orderCode("ORD-SEED-PREPARING-005")
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .retryCount(0)
                .refundType(RefundType.ORDER_DETAIL)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, org.mockito.Mockito.atLeastOnce()).createNotification(notificationCaptor.capture());
        NotificationModel inApp = notificationCaptor.getAllValues().stream()
                .filter(n -> n.getChannel() == NotificationChannel.IN_APP)
                .findFirst()
                .orElseThrow();
        assertThat(inApp.getTitle()).isEqualTo("Một số vé trong đơn cần hoàn tiền");
        assertThat(inApp.getContent()).contains("không thể đổi sang vé khác");
        assertThat(inApp.getContent()).doesNotContain("đã xử lý xong");
        assertThat(inApp.getContent()).doesNotContain("nhận vé");

        verify(emailService).sendEmail(
                eq(EmailType.REFUND_CUSTOMER_UPDATE),
                eq("member@daiphat.com"),
                emailContextCaptor.capture());
        assertThat(emailContextCaptor.getValue().get("isPartialInspectionRefund")).isEqualTo(true);
        assertThat(emailContextCaptor.getValue().get("orderCode")).isEqualTo("ORD-SEED-PREPARING-005");
    }

    @Test
    @DisplayName("WAITING_FOR_INFO FULL_ORDER: incident-cancel copy")
    void handleWaitingForInfo_incidentCancelMessage() {
        stubCustomerEmail();
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(3L)
                .customerId(customerId)
                .orderCode("ORD-3")
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .retryCount(0)
                .refundType(RefundType.FULL_ORDER)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, org.mockito.Mockito.atLeastOnce()).createNotification(notificationCaptor.capture());
        NotificationModel inApp = notificationCaptor.getAllValues().stream()
                .filter(n -> n.getChannel() == NotificationChannel.IN_APP)
                .findFirst()
                .orElseThrow();
        assertThat(inApp.getTitle()).isEqualTo("Cần cung cấp tài khoản nhận hoàn tiền");
        assertThat(inApp.getContent()).contains("đã được hủy do sự cố");
    }

    @Test
    @DisplayName("WAITING_FOR_INFO with retryCount>0: invalid bank retry copy")
    void handleWaitingForInfo_retryMessage() {
        stubCustomerEmail();
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(4L)
                .customerId(customerId)
                .orderCode("ORD-4")
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .retryCount(1)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, org.mockito.Mockito.atLeastOnce()).createNotification(notificationCaptor.capture());
        NotificationModel inApp = notificationCaptor.getAllValues().stream()
                .filter(n -> n.getChannel() == NotificationChannel.IN_APP)
                .findFirst()
                .orElseThrow();
        assertThat(inApp.getTitle()).isEqualTo("Cần cập nhật tài khoản nhận hoàn tiền");
        assertThat(inApp.getContent()).contains("không hợp lệ");
    }

    @Test
    @DisplayName("MANUAL_RESOLUTION: notifies customer to visit counter / CSKH")
    void handleManualResolution_notifiesCustomer() {
        stubCustomerEmail();
        RefundRequestStatusChangedEvent event = RefundRequestStatusChangedEvent.builder()
                .refundRequestId(5L)
                .customerId(customerId)
                .orderCode("ORD-5")
                .status(RefundRequestStatus.MANUAL_RESOLUTION)
                .retryCount(3)
                .build();

        listener.handleRefundRequestStatusChanged(event);

        verify(notificationService, org.mockito.Mockito.atLeastOnce()).createNotification(notificationCaptor.capture());
        NotificationModel inApp = notificationCaptor.getAllValues().stream()
                .filter(n -> n.getChannel() == NotificationChannel.IN_APP)
                .findFirst()
                .orElseThrow();
        assertThat(inApp.getTitle()).isEqualTo("Yêu cầu hoàn tiền cần hỗ trợ tại quầy");
        assertThat(inApp.getContent()).contains("vượt quá số lần cập nhật");
        assertThat(inApp.getReferenceType()).isEqualTo(NotificationReferenceType.REFUND_REQUEST);
    }
}
