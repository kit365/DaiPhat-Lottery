package com.daiphat.coreapi.application.service.mail;

import com.daiphat.coreapi.application.dto.request.mail.ForgotPasswordContext;
import com.daiphat.coreapi.application.strategy.email.EmailStrategy;
import com.daiphat.coreapi.application.strategy.email.EmailStrategyFactory;
import com.daiphat.coreapi.domain.model.enums.email.EmailType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.daiphat.coreapi.application.port.in.mail.EmailServicePort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Core EmailService")
class EmailServiceTest {

    @Test
    void sendEmail_mapPayload_delegatesToResolvedStrategy() {
        EmailStrategy strategy = mock(EmailStrategy.class);
        EmailStrategyFactory factory = mock(EmailStrategyFactory.class);
        EmailServicePort emailService = new EmailService(factory, new ObjectMapper());
        Map<String, Object> data = Map.of("otp", "123456");

        when(factory.getStrategy(EmailType.FORGOT_PW_OTP)).thenReturn(strategy);

        emailService.sendEmail(EmailType.FORGOT_PW_OTP, "test@daiphat.com", data);

        verify(strategy).process("test@daiphat.com", data);
    }

    @Test
    void sendEmail_objectPayload_convertsToMapBeforeDelegation() {
        EmailStrategy strategy = mock(EmailStrategy.class);
        EmailStrategyFactory factory = mock(EmailStrategyFactory.class);
        EmailServicePort emailService = new EmailService(factory, new ObjectMapper());
        ForgotPasswordContext context = ForgotPasswordContext.builder()
                .email("test@daiphat.com")
                .otp("123456")
                .build();

        when(factory.getStrategy(EmailType.FORGOT_PW_OTP)).thenReturn(strategy);

        emailService.sendEmail(EmailType.FORGOT_PW_OTP, "test@daiphat.com", context);

        verify(strategy).process(eq("test@daiphat.com"), org.mockito.ArgumentMatchers.argThat(map ->
                "test@daiphat.com".equals(map.get("email")) && "123456".equals(map.get("otp"))
        ));
    }

    @Test
    void factory_unknownType_throwsClearError() {
        EmailStrategyFactory factory = new EmailStrategyFactory(java.util.List.of());

        assertThatThrownBy(() -> factory.getStrategy(EmailType.WELCOME_VERIFY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No email strategy registered");
    }
}
