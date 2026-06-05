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
import com.daiphat.coreapi.application.event.UserCreatedEvent;
import com.daiphat.coreapi.application.event.UserRegisteredEvent;
import com.daiphat.coreapi.application.port.in.mail.EmailServicePort;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventListener {

    private final EmailServicePort emailService;
    private final AuthProperties authProperties;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserRegistered(UserRegisteredEvent event) {
        log.info("Handling UserRegisteredEvent for recipient: {}", event.email());
        try {
            UserVerificationContext emailContext = UserVerificationContext.builder()
                    .fullName(event.fullName())
                    .email(event.email())
                    .token(event.token())
                    .build();

            emailService.sendEmail(EmailType.WELCOME_VERIFY, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch verification email for {}: {}", event.email(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleForgotPassword(ForgotPasswordEvent event) {
        log.info("Handling ForgotPasswordEvent for recipient: {}", event.email());
        try {
            ForgotPasswordContext emailContext = ForgotPasswordContext.builder()
                    .email(event.email())
                    .otp(event.otp())
                    .build();

            emailService.sendEmail(EmailType.FORGOT_PW_OTP, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch forgot password email for {}: {}", event.email(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAdminResetPasswordOtp(AdminResetPasswordOtpEvent event) {
        log.info("Handling AdminResetPasswordOtpEvent for recipient: {}", event.email());
        try {
            ForgotPasswordContext emailContext = ForgotPasswordContext.builder()
                    .email(event.email())
                    .otp(event.otp())
                    .build();

            emailService.sendEmail(EmailType.ADMIN_RESET_PASSWORD_OTP, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch admin reset OTP email for {}: {}", event.email(), e.getMessage());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAdminResetPasswordSuccess(AdminResetPasswordSuccessEvent event) {
        log.info("Handling AdminResetPasswordSuccessEvent for recipient: {}", event.email());
        try {
            AdminResetPasswordSuccessContext emailContext = AdminResetPasswordSuccessContext.builder()
                    .email(event.email())
                    .fullName(event.fullName())
                    .password(event.password())
                    .loginUrl(authProperties.getFrontendUrl() + authProperties.getVerificationPaths().getLoginPath())
                    .build();

            emailService.sendEmail(EmailType.ADMIN_RESET_PASSWORD_SUCCESS, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch admin reset success email for {}: {}", event.email(), e.getMessage());
        }
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
}
