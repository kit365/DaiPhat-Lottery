package com.daiphat.accountservice.application.strategy.email;

import com.daiphat.accountservice.application.port.out.MailPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TC-STRATEGY-BASE")
class AbstractEmailStrategyTest {

    @Mock
    private MailPort mailPort;
    @Mock
    private RateLimiterPort rateLimiterPort;
    @Mock
    private TemplateEngine templateEngine;

    private TestEmailStrategy emailStrategy;
    private static final String RECIPIENT = "test@daiphat.com";

    @BeforeEach
    void setUp() {
        emailStrategy = new TestEmailStrategy(mailPort, rateLimiterPort, templateEngine);
    }

    @Test
    @DisplayName("RATE-LIMIT: Cho phép gửi khi chưa vượt ngưỡng")
    void checkRateLimit_Allowed() {
        // RateLimiterPort giờ trả về boolean
        when(rateLimiterPort.checkAndRecord(eq(RECIPIENT), any(AuthAction.class))).thenReturn(true);

        boolean result = emailStrategy.checkRateLimit(RECIPIENT);

        assertThat(result).isTrue();
        verify(rateLimiterPort).checkAndRecord(eq(RECIPIENT), eq(AuthAction.VERIFY_EMAIL));
    }

    @Test
    @DisplayName("RATE-LIMIT: Chặn gửi khi vượt ngưỡng")
    void checkRateLimit_Blocked() {
        when(rateLimiterPort.checkAndRecord(eq(RECIPIENT), any(AuthAction.class))).thenReturn(false);

        boolean result = emailStrategy.checkRateLimit(RECIPIENT);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("PROCESS: Thực thi render và gửi mail thành công")
    void process_Success() {
        Map<String, Object> data = Map.of("otp", "123456");
        when(templateEngine.process(anyString(), any(Context.class))).thenReturn("<html>body</html>");

        emailStrategy.process(RECIPIENT, data);

        verify(templateEngine).process(eq("test-path"), any(Context.class));
        verify(mailPort).sendMail(eq(RECIPIENT), eq("Test Subject"), eq("<html>body</html>"), eq(true));
    }

    // Lớp giả lập để test Abstract class
    private static class TestEmailStrategy extends AbstractEmailStrategy {
        public TestEmailStrategy(MailPort mailPort, RateLimiterPort rateLimiterPort, TemplateEngine templateEngine) {
            super(mailPort, rateLimiterPort, templateEngine);
        }

        @Override
        public EmailType getSupportedType() {
            return EmailType.WELCOME_VERIFY;
        }

        @Override
        protected String getSubject(Map<String, Object> data) {
            return "Test Subject";
        }

        @Override
        protected String getTemplatePath() {
            return "test-path";
        }

        @Override
        protected AuthAction getAction() {
            return AuthAction.VERIFY_EMAIL;
        }
    }
}
