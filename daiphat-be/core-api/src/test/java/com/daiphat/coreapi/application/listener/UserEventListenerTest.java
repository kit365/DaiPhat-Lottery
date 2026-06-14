package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.dto.request.mail.AdminResetPasswordSuccessContext;
import com.daiphat.coreapi.application.dto.request.mail.ForgotPasswordContext;
import com.daiphat.coreapi.application.event.AdminResetPasswordOtpEvent;
import com.daiphat.coreapi.application.event.AdminResetPasswordSuccessEvent;
import com.daiphat.coreapi.application.event.ForgotPasswordEvent;
import com.daiphat.coreapi.application.event.UserEmailVerifiedEvent;
import com.daiphat.coreapi.application.event.UserPasswordChangedEvent;
import com.daiphat.coreapi.application.port.in.mail.EmailServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.argThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserEventListener Unit Tests")
class UserEventListenerTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Long NOTIFICATION_ID = 99L;
    private static final String EMAIL = "tuankiet@daiphat.com";
    private static final String OTP = "123456";

    @Mock
    private EmailServicePort emailService;

    @Mock
    private NotificationServicePort notificationService;

    @Mock
    private FcmPushPort fcmPushPort;

    @Mock
    private UserRepositoryPort userRepositoryPort;

    private UserEventListener userEventListener;

    @BeforeEach
    void setUp() {
        AuthProperties authProperties = new AuthProperties();
        userEventListener = new UserEventListener(
                emailService,
                notificationService,
                authProperties,
                fcmPushPort,
                userRepositoryPort
        );
    }

    @Test
    void handleForgotPassword_success_createsEmailNotificationAndMarksSent() {
        ForgotPasswordEvent event = ForgotPasswordEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .otp(OTP)
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> {
                    NotificationModel notification = invocation.getArgument(0);
                    notification.setNotificationId(NOTIFICATION_ID);
                    return notification;
                });

        userEventListener.handleForgotPassword(event);

        ArgumentCaptor<NotificationModel> captor = ArgumentCaptor.forClass(NotificationModel.class);
        verify(notificationService).createNotification(captor.capture());
        NotificationModel notification = captor.getValue();
        assertThat(notification.getUserId()).isEqualTo(USER_ID);
        assertThat(notification.getTitle()).isEqualTo("Mã OTP đổi mật khẩu đã được gửi");
        assertThat(notification.getReferenceId()).isEqualTo(OTP);
        assertThat(notification.getChannel()).isEqualTo(NotificationChannel.EMAIL);
        assertThat(notification.getType()).isEqualTo(NotificationType.AUTH);
        assertThat(notification.getReferenceType()).isEqualTo(NotificationReferenceType.AUTH);
        verify(emailService).sendEmail(eq(EmailType.FORGOT_PW_OTP), eq(EMAIL), any(ForgotPasswordContext.class));
        verify(notificationService).markAsSent(NOTIFICATION_ID);
        verify(notificationService, never()).markAsFailed(any());
    }

    @Test
    void handleForgotPassword_fail_marksFailed() {
        ForgotPasswordEvent event = ForgotPasswordEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .otp(OTP)
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> {
                    NotificationModel notification = invocation.getArgument(0);
                    notification.setNotificationId(NOTIFICATION_ID);
                    return notification;
                });
        doThrow(new RuntimeException("mail fail"))
                .when(emailService).sendEmail(eq(EmailType.FORGOT_PW_OTP), eq(EMAIL), any(ForgotPasswordContext.class));

        userEventListener.handleForgotPassword(event);

        verify(notificationService).markAsFailed(NOTIFICATION_ID);
        verify(notificationService, never()).markAsSent(any());
    }

    @Test
    void handleAdminResetPasswordOtp_success_createsEmailNotificationAndMarksSent() {
        AdminResetPasswordOtpEvent event = AdminResetPasswordOtpEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .fullName("Kiet Ngo")
                .otp(OTP)
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> {
                    NotificationModel notification = invocation.getArgument(0);
                    notification.setNotificationId(NOTIFICATION_ID);
                    return notification;
                });

        userEventListener.handleAdminResetPasswordOtp(event);

        ArgumentCaptor<NotificationModel> captor = ArgumentCaptor.forClass(NotificationModel.class);
        verify(notificationService).createNotification(captor.capture());
        NotificationModel notification = captor.getValue();
        assertThat(notification.getTitle()).isEqualTo("Mã OTP đặt lại mật khẩu đã được gửi");
        assertThat(notification.getReferenceId()).isEqualTo(OTP);
        verify(emailService).sendEmail(eq(EmailType.ADMIN_RESET_PASSWORD_OTP), eq(EMAIL), any(ForgotPasswordContext.class));
        verify(notificationService).markAsSent(NOTIFICATION_ID);
    }

    @Test
    void handleAdminResetPasswordOtp_fail_marksFailed() {
        AdminResetPasswordOtpEvent event = AdminResetPasswordOtpEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .fullName("Kiet Ngo")
                .otp(OTP)
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> {
                    NotificationModel notification = invocation.getArgument(0);
                    notification.setNotificationId(NOTIFICATION_ID);
                    return notification;
                });
        doThrow(new RuntimeException("mail fail"))
                .when(emailService).sendEmail(eq(EmailType.ADMIN_RESET_PASSWORD_OTP), eq(EMAIL), any(ForgotPasswordContext.class));

        userEventListener.handleAdminResetPasswordOtp(event);

        verify(notificationService).markAsFailed(NOTIFICATION_ID);
        verify(notificationService, never()).markAsSent(any());
    }

    @Test
    @DisplayName("[DP-444] Xử lý sự kiện admin reset mật khẩu thành công (tạo email notification)")
    void handleAdminResetPasswordSuccess_success_createsEmailNotificationAndMarksSent() {
        AdminResetPasswordSuccessEvent event = AdminResetPasswordSuccessEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .fullName("Kiet Ngo")
                .password("TempPass123!")
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> {
                    NotificationModel notification = invocation.getArgument(0);
                    notification.setNotificationId(NOTIFICATION_ID);
                    return notification;
                });

        userEventListener.handleAdminResetPasswordSuccess(event);

        ArgumentCaptor<NotificationModel> captor = ArgumentCaptor.forClass(NotificationModel.class);
        verify(notificationService).createNotification(captor.capture());
        NotificationModel notification = captor.getValue();
        assertThat(notification.getTitle()).isEqualTo("Mật khẩu mới đã được gửi");
        assertThat(notification.getReferenceId()).isNull();
        verify(emailService).sendEmail(eq(EmailType.ADMIN_RESET_PASSWORD_SUCCESS), eq(EMAIL), any(AdminResetPasswordSuccessContext.class));
        verify(notificationService).markAsSent(NOTIFICATION_ID);
    }

    @Test
    @DisplayName("[DP-444] Đánh dấu thất bại nếu gửi email admin reset mật khẩu bị lỗi")
    void handleAdminResetPasswordSuccess_fail_marksFailed() {
        AdminResetPasswordSuccessEvent event = AdminResetPasswordSuccessEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .fullName("Kiet Ngo")
                .password("TempPass123!")
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> {
                    NotificationModel notification = invocation.getArgument(0);
                    notification.setNotificationId(NOTIFICATION_ID);
                    return notification;
                });
        doThrow(new RuntimeException("mail fail"))
                .when(emailService).sendEmail(eq(EmailType.ADMIN_RESET_PASSWORD_SUCCESS), eq(EMAIL), any(AdminResetPasswordSuccessContext.class));

        userEventListener.handleAdminResetPasswordSuccess(event);

        verify(notificationService).markAsFailed(NOTIFICATION_ID);
        verify(notificationService, never()).markAsSent(any());
    }

    @Test
    @DisplayName("[DP-440] Xử lý sự kiện xác thực email thành công (tạo thông báo in-app và archive email auth)")
    void handleUserEmailVerified_success_archivesEmailAndCreatesWelcomeInApp() {
        UserEmailVerifiedEvent event = UserEmailVerifiedEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .fullName("John Doe")
                .token("test-token")
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepositoryPort.findById(USER_ID)).thenReturn(Optional.empty());

        userEventListener.handleUserEmailVerified(event);

        verify(notificationService).archiveAuthEmailNotification(USER_ID, "test-token");

        verify(notificationService).createNotification(argThat(notification ->
                notification.getUserId().equals(USER_ID) &&
                "Xác thực tài khoản thành công".equals(notification.getTitle()) &&
                NotificationType.AUTH.equals(notification.getType()) &&
                NotificationChannel.IN_APP.equals(notification.getChannel()) &&
                NotificationStatus.SENT.equals(notification.getStatus())
        ));
    }

    @Test
    @DisplayName("[DP-444] Xử lý sự kiện đổi mật khẩu thành công (tạo thông báo in-app)")
    void handleUserPasswordChanged_success_createsInAppNotificationAndMarksSent() {
        UserPasswordChangedEvent event = UserPasswordChangedEvent.builder()
                .userId(USER_ID)
                .email(EMAIL)
                .build();
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepositoryPort.findById(USER_ID)).thenReturn(Optional.empty());

        userEventListener.handleUserPasswordChanged(event);

        verify(notificationService).createNotification(argThat(notification ->
                notification.getUserId().equals(USER_ID) &&
                "Mật khẩu đã được cập nhật".equals(notification.getTitle()) &&
                NotificationType.AUTH.equals(notification.getType()) &&
                NotificationChannel.IN_APP.equals(notification.getChannel()) &&
                NotificationStatus.SENT.equals(notification.getStatus())
        ));
    }
}
