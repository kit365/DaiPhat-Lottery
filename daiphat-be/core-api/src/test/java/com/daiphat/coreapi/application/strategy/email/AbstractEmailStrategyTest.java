package com.daiphat.coreapi.application.strategy.email;

import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.port.out.mail.MailPort;
import com.daiphat.coreapi.domain.model.enums.EmailType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Core email strategies")
class AbstractEmailStrategyTest {

    private MailPort mailPort;
    private TemplateEngine templateEngine;

    @BeforeEach
    void setUp() {
        mailPort = mock(MailPort.class);
        templateEngine = mock(TemplateEngine.class);
    }

    @Test
    void abstractStrategy_process_rendersTemplateAndSendsHtmlMail() {
        TestEmailStrategy strategy = new TestEmailStrategy(mailPort, templateEngine);
        when(templateEngine.process(eq("emails/test"), any(Context.class))).thenReturn("<html>ok</html>");

        strategy.process("test@daiphat.com", Map.of("otp", "123456"));

        verify(templateEngine).process(eq("emails/test"), any(Context.class));
        verify(mailPort).sendMail("test@daiphat.com", "Test Subject", "<html>ok</html>", true);
    }

    @Test
    void welcomeVerifyStrategy_addsVerifyLinkBeforeRendering() {
        AuthProperties authProperties = new AuthProperties();
        authProperties.setFrontendUrl("https://app.daiphat.com");
        authProperties.getVerificationPaths().setClientPath("/verify-email?token=");
        WelcomeVerifyStrategy strategy = new WelcomeVerifyStrategy(mailPort, templateEngine, authProperties);
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);

        when(templateEngine.process(eq("emails/verify-email"), any(Context.class))).thenReturn("<html>verify</html>");

        strategy.process("test@daiphat.com", Map.of("token", "abc-token", "fullName", "Kiet"));

        verify(templateEngine).process(eq("emails/verify-email"), contextCaptor.capture());
        assertThat(contextCaptor.getValue().getVariable("verifyLink"))
                .isEqualTo("https://app.daiphat.com/verify-email?token=abc-token");
        verify(mailPort).sendMail(
                eq("test@daiphat.com"),
                eq("Chào mừng bạn đến với DaiPhat - Xác thực tài khoản của bạn"),
                eq("<html>verify</html>"),
                eq(true)
        );
    }

    @Test
    void factory_registersStrategiesBySupportedType() {
        TestEmailStrategy strategy = new TestEmailStrategy(mailPort, templateEngine);
        EmailStrategyFactory factory = new EmailStrategyFactory(java.util.List.of(strategy));

        assertThat(factory.getStrategy(EmailType.FORGOT_PW_OTP)).isSameAs(strategy);
    }

    private static class TestEmailStrategy extends AbstractEmailStrategy {

        TestEmailStrategy(MailPort mailPort, TemplateEngine templateEngine) {
            super(mailPort, templateEngine);
        }

        @Override
        public EmailType getSupportedType() {
            return EmailType.FORGOT_PW_OTP;
        }

        @Override
        protected String getSubject(Map<String, Object> data) {
            return "Test Subject";
        }

        @Override
        protected String getTemplatePath() {
            return "emails/test";
        }
    }
}
