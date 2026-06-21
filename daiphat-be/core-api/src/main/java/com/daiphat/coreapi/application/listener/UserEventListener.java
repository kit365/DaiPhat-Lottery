package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.request.mail.AdminCreateUserContext;
import com.daiphat.coreapi.application.dto.request.mail.AdminResetPasswordSuccessContext;
import com.daiphat.coreapi.application.dto.request.mail.ForgotPasswordContext;
import com.daiphat.coreapi.application.dto.request.mail.StaffInviteContext;
import com.daiphat.coreapi.application.dto.request.mail.UserVerificationContext;
import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.event.AdminResetPasswordOtpEvent;
import com.daiphat.coreapi.application.event.AdminResetPasswordSuccessEvent;
import com.daiphat.coreapi.application.event.ForgotPasswordEvent;
import com.daiphat.coreapi.application.event.StaffInviteEvent;
import com.daiphat.coreapi.application.dto.notification.FcmPushData;
import com.daiphat.coreapi.application.event.UserCreatedEvent;
import com.daiphat.coreapi.application.event.UserEmailVerifiedEvent;
import com.daiphat.coreapi.application.event.UserGuestOrdersLinkRequestedEvent;
import com.daiphat.coreapi.application.event.UserPasswordChangedEvent;
import com.daiphat.coreapi.application.event.UserRegisteredEvent;
import com.daiphat.coreapi.application.event.UserWelcomeEvent;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.port.in.mail.EmailServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventListener {

    private final EmailServicePort emailService;
    private final NotificationServicePort notificationService;
    private final OrderServicePort orderServicePort;
    private final AuthProperties authProperties;
    private final FcmPushPort fcmPushPort;
    private final UserRepositoryPort userRepositoryPort;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserRegistered(UserRegisteredEvent event) {
        final String emailTitle = "Email xác thực tài khoản đã được gửi";
        final String emailContent = "Chúng tôi đã gửi email xác thực tài khoản đến "
                + event.email()
                + ". Vui lòng kiểm tra hộp thư của bạn.";

        log.info("Handling UserRegisteredEvent for recipient: {}", event.email());
        NotificationModel emailNotification = NotificationModel.builder()
                .userId(event.userId())
                .title(emailTitle)
                .content(emailContent)
                .type(NotificationType.AUTH)
                .channel(NotificationChannel.EMAIL)
                .referenceId(event.token())
                .referenceType(NotificationReferenceType.AUTH)
                .build();
        emailNotification = notificationService.createNotification(emailNotification);

        try {
            UserVerificationContext emailContext = UserVerificationContext.builder()
                    .fullName(event.fullName())
                    .email(event.email())
                    .token(event.token())
                    .build();

            emailService.sendEmail(EmailType.WELCOME_VERIFY, event.email(), emailContext);
            notificationService.markAsSent(emailNotification.getNotificationId());
        } catch (Exception e) {
            notificationService.markAsFailed(emailNotification.getNotificationId());
            log.error("Failed to dispatch verification email for {}: {}", event.email(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserEmailVerified(UserEmailVerifiedEvent event) {
        log.info("Handling UserEmailVerifiedEvent for recipient: {}", event.email());
        notificationService.archiveAuthEmailNotification(event.userId(), event.token());
        createWelcomeInAppNotification(event.userId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserWelcome(UserWelcomeEvent event) {
        log.info("Handling UserWelcomeEvent for recipient: {}", event.email());
        createWelcomeInAppNotification(event.userId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleGuestOrderLinkRequested(UserGuestOrdersLinkRequestedEvent event) {
        log.info("Handling UserGuestOrdersLinkRequestedEvent for recipient: {}", event.email());
        orderServicePort.linkGuestOrdersToAccount(event.userId(), event.email());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserPasswordChanged(UserPasswordChangedEvent event) {
        final String inAppTitle = "Mật khẩu đã được cập nhật";
        final String inAppContent = "Mật khẩu tài khoản của bạn đã được thay đổi thành công.";

        log.info("Handling UserPasswordChangedEvent for recipient: {}", event.email());

        NotificationModel inAppNotification = NotificationModel.builder()
                .userId(event.userId())
                .title(inAppTitle)
                .content(inAppContent)
                .type(NotificationType.AUTH)
                .channel(NotificationChannel.IN_APP)
                .referenceType(NotificationReferenceType.AUTH)
                .build();
        inAppNotification.markAsSent();
        NotificationModel saved = notificationService.createNotification(inAppNotification);
        sendPushNotificationToUser(saved);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleForgotPassword(ForgotPasswordEvent event) {
        final String emailTitle = "Mã OTP đổi mật khẩu đã được gửi";
        final String emailContent = "Chúng tôi đã gửi mã OTP đổi mật khẩu đến " + event.email() + ".";

        log.info("Handling ForgotPasswordEvent for recipient: {}", event.email());
        ForgotPasswordContext emailContext = ForgotPasswordContext.builder()
                .email(event.email())
                .otp(event.otp())
                .build();

        dispatchEmailNotification(
                event.userId(),
                emailTitle,
                emailContent,
                event.otp(),
                EmailType.FORGOT_PW_OTP,
                event.email(),
                emailContext,
                "Failed to dispatch forgot password email for {}: {}"
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAdminResetPasswordOtp(AdminResetPasswordOtpEvent event) {
        final String emailTitle = "Mã OTP đặt lại mật khẩu đã được gửi";
        final String emailContent = "Chúng tôi đã gửi mã OTP đặt lại mật khẩu đến " + event.email() + ".";

        log.info("Handling AdminResetPasswordOtpEvent for recipient: {}", event.email());
        ForgotPasswordContext emailContext = ForgotPasswordContext.builder()
                .email(event.email())
                .otp(event.otp())
                .build();

        dispatchEmailNotification(
                event.userId(),
                emailTitle,
                emailContent,
                event.otp(),
                EmailType.ADMIN_RESET_PASSWORD_OTP,
                event.email(),
                emailContext,
                "Failed to dispatch admin reset OTP email for {}: {}"
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAdminResetPasswordSuccess(AdminResetPasswordSuccessEvent event) {
        final String emailTitle = "Mật khẩu mới đã được gửi";
        final String emailContent = "Chúng tôi đã gửi mật khẩu mới cho tài khoản " + event.email() + ".";

        log.info("Handling AdminResetPasswordSuccessEvent for recipient: {}", event.email());
        AdminResetPasswordSuccessContext emailContext = AdminResetPasswordSuccessContext.builder()
                .email(event.email())
                .fullName(event.fullName())
                .password(event.password())
                .loginUrl(authProperties.getFrontendUrl() + authProperties.getVerificationPaths().getLoginPath())
                .build();

        dispatchEmailNotification(
                event.userId(),
                emailTitle,
                emailContent,
                null,
                EmailType.ADMIN_RESET_PASSWORD_SUCCESS,
                event.email(),
                emailContext,
                "Failed to dispatch admin reset success email for {}: {}"
        );
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserCreated(UserCreatedEvent event) {
        log.info("Handling UserCreatedEvent for recipient: {}", event.email());
        try {
            AdminCreateUserContext emailContext = AdminCreateUserContext.builder()
                    .email(event.email())
                    .fullName(event.fullName())
                    .password(event.password())
                    .build();

            emailService.sendEmail(EmailType.ADMIN_CREATE_USER, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch admin create user email for {}: {}", event.email(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleStaffInvite(StaffInviteEvent event) {
        log.info("Handling StaffInviteEvent for recipient: {}", event.email());
        try {
            StaffInviteContext emailContext = StaffInviteContext.builder()
                    .email(event.email())
                    .fullName(event.fullName())
                    .token(event.token())
                    .roleName(event.roleName())
                    .build();

            emailService.sendEmail(EmailType.STAFF_INVITE, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch staff invite email for {}: {}", event.email(), e.getMessage());
        }
    }

    private void createWelcomeInAppNotification(UUID userId) {
        final String inAppTitle = "Xác thực tài khoản thành công";
        final String inAppContent = "Tài khoản của bạn đã được xác thực thành công. Chào mừng bạn đến với Đại Phát.";

        NotificationModel inAppNotification = NotificationModel.builder()
                .userId(userId)
                .title(inAppTitle)
                .content(inAppContent)
                .type(NotificationType.AUTH)
                .channel(NotificationChannel.IN_APP)
                .referenceType(NotificationReferenceType.AUTH)
                .build();
        inAppNotification.markAsSent();
        NotificationModel saved = notificationService.createNotification(inAppNotification);
        sendPushNotificationToUser(saved);
    }

    private void sendPushNotificationToUser(NotificationModel notification) {
        userRepositoryPort.findById(notification.getUserId()).ifPresent(user -> {
            if (user.getFcmToken() != null && !user.getFcmToken().trim().isEmpty()) {
                FcmPushData data = FcmPushData.builder()
                        .notificationId(notification.getNotificationId())
                        .type(notification.getType() != null ? notification.getType().name() : null)
                        .referenceId(notification.getReferenceId())
                        .referenceType(notification.getReferenceType() != null ? notification.getReferenceType().name() : null)
                        .build();
                fcmPushPort.sendPushNotification(user.getFcmToken(), notification.getTitle(), notification.getContent(), data);
            }
        });
    }

    private void dispatchEmailNotification(
            UUID userId,
            String emailTitle,
            String emailContent,
            String referenceId,
            EmailType emailType,
            String recipientEmail,
            Object emailContext,
            String errorLogTemplate
    ) {
        NotificationModel emailNotification = NotificationModel.builder()
                .userId(userId)
                .title(emailTitle)
                .content(emailContent)
                .type(NotificationType.AUTH)
                .channel(NotificationChannel.EMAIL)
                .referenceId(referenceId)
                .referenceType(NotificationReferenceType.AUTH)
                .build();
        emailNotification = notificationService.createNotification(emailNotification);

        try {
            emailService.sendEmail(emailType, recipientEmail, emailContext);
            notificationService.markAsSent(emailNotification.getNotificationId());
        } catch (Exception e) {
            notificationService.markAsFailed(emailNotification.getNotificationId());
            log.error(errorLogTemplate, recipientEmail, e.getMessage());
        }
    }
}
