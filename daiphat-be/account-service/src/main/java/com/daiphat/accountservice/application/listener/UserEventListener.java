package com.daiphat.accountservice.application.listener;

import com.daiphat.accountservice.application.dto.request.mail.AdminCreateUserContext;
import com.daiphat.accountservice.application.dto.request.mail.AdminResetPasswordSuccessContext;
import com.daiphat.accountservice.application.dto.request.mail.ForgotPasswordContext;
import com.daiphat.accountservice.application.dto.request.mail.UserVerificationContext;
import com.daiphat.accountservice.application.event.*;
import com.daiphat.accountservice.application.port.in.mail.EmailServicePort;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;



@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventListener {



    private final EmailServicePort emailServicePort;
    private final com.daiphat.accountservice.application.config.AuthProperties authProperties;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEvent(UserCreatedEvent event) {
        try {
            log.info("Transaction committed for user {}. Dispatching welcome email...", event.email());

            AdminCreateUserContext emailContext = AdminCreateUserContext.builder()
                    .firstName(event.firstName())
                    .email(event.email())
                    .password(event.password())
                    .loginUrl(authProperties.getFrontendUrl() + authProperties.getVerificationPaths().getLoginPath())
                    .build();

            emailServicePort.sendAsync(EmailType.ADMIN_CREATE_USER, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch welcome email for {}: {}", event.email(), e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEvent(UserRegisteredEvent event) {
        try {
            log.info("Registration committed for {}. Dispatching verification email...", event.email());

            UserVerificationContext emailContext = UserVerificationContext.builder()
                    .firstName(event.firstName())
                    .email(event.email())
                    .token(event.token())
                    .build();

            emailServicePort.sendAsync(EmailType.WELCOME_VERIFY, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch verification email for {}: {}", event.email(), e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEvent(ForgotPasswordEvent event) {
        try {
            log.info("Password reset initiated for {}. Dispatching OTP email...", event.email());

            ForgotPasswordContext emailContext = ForgotPasswordContext.builder()
                    .email(event.email())
                    .otp(event.otp())
                    .build();

            emailServicePort.sendAsync(EmailType.FORGOT_PW_OTP, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch forgot password email for {}: {}", event.email(), e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEvent(AdminResetPasswordOtpEvent event) {
        try {
            log.info("Admin reset password initiated for {}. Dispatching OTP email...", event.email());

            ForgotPasswordContext emailContext = ForgotPasswordContext.builder()
                    .email(event.email())
                    .otp(event.otp())
                    .build();

            emailServicePort.sendAsync(EmailType.ADMIN_RESET_PASSWORD_OTP, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch admin reset OTP email for {}: {}", event.email(), e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEvent(AdminResetPasswordSuccessEvent event) {
        try {
            log.info("Admin reset password completed for {}. Dispatching new password email...", event.email());

            AdminResetPasswordSuccessContext emailContext = AdminResetPasswordSuccessContext.builder()
                    .firstName(event.firstName())
                    .email(event.email())
                    .password(event.password())
                    .loginUrl(authProperties.getFrontendUrl() + authProperties.getVerificationPaths().getLoginPath())
                    .build();

            emailServicePort.sendAsync(EmailType.ADMIN_RESET_PASSWORD_SUCCESS, event.email(), emailContext);
        } catch (Exception e) {
            log.error("Failed to dispatch admin reset success email for {}: {}", event.email(), e.getMessage());
        }
    }
}
