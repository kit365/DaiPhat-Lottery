package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.daiphat.coreapi.application.event.OrderPaidForProcessingEvent;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.application.service.order.PaymentComplaintReminderConfigService;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-386][DP-389] OrderEventListener Unit Tests")
class OrderEventListenerTest {

    private OrderEventListener orderEventListener;

    @Mock
    private NotificationServicePort notificationService;

    @Mock
    private UserRepositoryPort userRepositoryPort;

    @Mock
    private FcmPushPort fcmPushPort;

    @Mock
    private PaymentComplaintReminderConfigService paymentComplaintReminderConfigService;

    @Captor
    private ArgumentCaptor<NotificationModel> notificationCaptor;

    @Captor
    private ArgumentCaptor<FcmPushData> pushDataCaptor;

    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID ADMIN_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ORDER_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @BeforeEach
    void setUp() {
        orderEventListener = new OrderEventListener(
                notificationService,
                userRepositoryPort,
                fcmPushPort,
                paymentComplaintReminderConfigService
        );
    }

    @Test
    @DisplayName("[DP-386][DP-389] handleOrderPaidForProcessing sends notification to admins and operators")
    void handleOrderPaidForProcessing_sendsNotificationToAdmins() {
        UserModel admin = UserModel.builder()
                .id(ADMIN_ID)
                .status(UserStatus.ACTIVE)
                .fcmToken("fcm-admin-token")
                .build();

        OrderPaidForProcessingEvent event = new OrderPaidForProcessingEvent(ORDER_ID, "ORD-123");

        when(userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ADMIN, RoleConstants.ROLE_STAFF_OPERATOR)))
                .thenReturn(List.of(admin));

        NotificationModel savedNotification = NotificationModel.builder()
                .notificationId(1L)
                .type(NotificationType.ORDER)
                .referenceId(ORDER_ID.toString())
                .build();
        when(notificationService.createNotification(any(NotificationModel.class))).thenReturn(savedNotification);

        orderEventListener.handleOrderPaidForProcessing(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        NotificationModel notification = notificationCaptor.getValue();
        assertThat(notification.getUserId()).isEqualTo(ADMIN_ID);
        assertThat(notification.getType()).isEqualTo(NotificationType.ORDER);
        assertThat(notification.getChannel()).isEqualTo(NotificationChannel.IN_APP);
        assertThat(notification.getReferenceId()).isEqualTo(ORDER_ID.toString());
        assertThat(notification.getReferenceType()).isEqualTo(NotificationReferenceType.ORDER);
        assertThat(notification.getTitle()).isEqualTo("Có đơn hàng mới cần xử lý");

        verify(fcmPushPort).sendPushNotification(eq("fcm-admin-token"), any(), any(), pushDataCaptor.capture());
        assertThat(pushDataCaptor.getValue().notificationId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("[DP-386][DP-389] handleOrderStatusChanged sends notification to customer when status is COMPLETED")
    void handleOrderStatusChanged_sendsNotificationToCustomer() {
        UserModel customer = UserModel.builder()
                .id(CUSTOMER_ID)
                .status(UserStatus.ACTIVE)
                .fcmToken("fcm-customer-token")
                .build();

        OrderStatusChangedEvent event = new OrderStatusChangedEvent(ORDER_ID, CUSTOMER_ID, "ORD-123", OrderStatus.COMPLETED);

        when(userRepositoryPort.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

        NotificationModel savedNotification = NotificationModel.builder()
                .notificationId(2L)
                .type(NotificationType.ORDER)
                .referenceId(ORDER_ID.toString())
                .build();
        when(notificationService.createNotification(any(NotificationModel.class))).thenReturn(savedNotification);

        orderEventListener.handleOrderStatusChanged(event);

        verify(notificationService).createNotification(notificationCaptor.capture());
        NotificationModel notification = notificationCaptor.getValue();
        assertThat(notification.getUserId()).isEqualTo(CUSTOMER_ID);
        assertThat(notification.getType()).isEqualTo(NotificationType.ORDER);
        assertThat(notification.getChannel()).isEqualTo(NotificationChannel.IN_APP);
        assertThat(notification.getReferenceId()).isEqualTo(ORDER_ID.toString());
        assertThat(notification.getTitle()).isEqualTo("Đơn hàng hoàn thành");

        verify(fcmPushPort).sendPushNotification(eq("fcm-customer-token"), any(), any(), pushDataCaptor.capture());
        assertThat(pushDataCaptor.getValue().notificationId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("[DP-386][DP-389] handleOrderStatusChanged ignores PENDING_PAYMENT status")
    void handleOrderStatusChanged_ignoresPendingPayment() {
        OrderStatusChangedEvent event = new OrderStatusChangedEvent(ORDER_ID, CUSTOMER_ID, "ORD-123", OrderStatus.PENDING_PAYMENT);

        orderEventListener.handleOrderStatusChanged(event);

        verify(notificationService, never()).createNotification(any());
        verify(fcmPushPort, never()).sendPushNotification(any(), any(), any(), any());
    }
}
