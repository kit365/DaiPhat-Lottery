package com.daiphat.accountservice.application.service;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.event.EmailTaskDTO;
import com.daiphat.accountservice.domain.exception.EmailRateLimitException;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import com.daiphat.accountservice.infrastructure.adapter.notification.rabbitmq.RabbitEmailTaskProducer;
import com.daiphat.accountservice.application.strategy.email.EmailStrategy;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TC-EMAIL-SERVICE")
class EmailServiceTest {

    @Mock
    private RabbitEmailTaskProducer rabbitEmailTaskProducer;
    @Mock
    private AuthProperties authProperties;
    @Mock
    private EmailStrategy mockStrategy;

    private MeterRegistry meterRegistry;
    private EmailService emailService;
    private static final String RECIPIENT = "test@daiphat.com";

    @BeforeEach
    void setUp() {
        // Dùng SimpleMeterRegistry thật để tránh NPE khi gọi Timer.start()
        meterRegistry = new SimpleMeterRegistry();

        // Chuẩn bị túi quân lương AuthProperties
        AuthProperties.Email emailProps = new AuthProperties.Email();
        emailProps.setMaxRetries(3);
        emailProps.setInitialBackoff(Duration.ofSeconds(1));
        emailProps.setMaxBackoff(Duration.ofSeconds(5));
        lenient().when(authProperties.getEmail()).thenReturn(emailProps);

        // Gắn Lệnh bài Strategy
        lenient().when(mockStrategy.getSupportedType()).thenReturn(EmailType.WELCOME_VERIFY);

        emailService = new EmailService(List.of(mockStrategy), rabbitEmailTaskProducer, authProperties, meterRegistry);
    }

    @Test
    @DisplayName("PRODUCER: Gửi mail thành công - Task được enqueue")
    void sendEmail_Success() {
        when(mockStrategy.checkRateLimit(RECIPIENT)).thenReturn(true);

        emailService.sendEmail(EmailType.WELCOME_VERIFY, RECIPIENT, Map.of("key", "val"));

        verify(rabbitEmailTaskProducer).sendEmailTask(any(EmailTaskDTO.class));
        // Kiểm tra metric đã được ghi nhận đúng tên: email.task.produced
        assertThat(meterRegistry.find("email.task.produced").counter()).isNotNull();
    }

    @Test
    @DisplayName("PRODUCER: Gửi mail thất bại - Bị Rate Limit")
    void sendEmail_Fail_RateLimited() {
        when(mockStrategy.checkRateLimit(RECIPIENT)).thenReturn(false);

        assertThatThrownBy(() -> emailService.sendEmail(EmailType.WELCOME_VERIFY, RECIPIENT, Map.of()))
                .isInstanceOf(EmailRateLimitException.class);

        verify(rabbitEmailTaskProducer, never()).sendEmailTask(any());
        assertThat(meterRegistry.find("email.rate_limit.triggered").counter()).isNotNull();
    }

    @Test
    @DisplayName("CONSUMER: Xử lý thành công - Không retry")
    void processAsyncEmail_Success() {
        EmailTaskDTO task = EmailTaskDTO.builder()
                .type(EmailType.WELCOME_VERIFY)
                .to(RECIPIENT)
                .attempt(0)
                .maxRetries(3)
                .parameters(Map.of("key", "val"))
                .build();

        emailService.processAsyncEmail(task);

        verify(mockStrategy).process(eq(RECIPIENT), anyMap());
        verify(rabbitEmailTaskProducer, never()).sendEmailTask(any());
        
        // Kiểm tra Timer đã ghi nhận
        assertThat(meterRegistry.find("email.task.processing").timer()).isNotNull();
    }

    @Test
    @DisplayName("CONSUMER: Xử lý thất bại - Thực hiện Retry")
    void processAsyncEmail_Fail_TriggerRetry() {
        EmailTaskDTO task = EmailTaskDTO.builder()
                .type(EmailType.WELCOME_VERIFY)
                .to(RECIPIENT)
                .attempt(0)
                .maxRetries(3)
                .parameters(Map.of("otp", "654321"))
                .build();

        doThrow(new RuntimeException("SMTP Down"))
            .when(mockStrategy).process(anyString(), anyMap());

        emailService.processAsyncEmail(task);

        ArgumentCaptor<EmailTaskDTO> taskCaptor = ArgumentCaptor.forClass(EmailTaskDTO.class);
        verify(rabbitEmailTaskProducer).sendEmailTask(taskCaptor.capture());

        assertThat(taskCaptor.getValue().getAttempt()).isEqualTo(1);
    }

    @Test
    @DisplayName("CONSUMER: Xử lý thất bại quá số lần - Ngừng")
    void processAsyncEmail_Fail_MaxRetriesExhausted() {
        EmailTaskDTO task = EmailTaskDTO.builder()
                .type(EmailType.WELCOME_VERIFY)
                .to(RECIPIENT)
                .attempt(3)
                .maxRetries(3)
                .parameters(Map.of())
                .build();

        doThrow(new RuntimeException("SMTP Permanent Fail"))
            .when(mockStrategy).process(anyString(), anyMap());

        emailService.processAsyncEmail(task);

        verify(rabbitEmailTaskProducer, never()).sendEmailTask(any());
        assertThat(meterRegistry.find("email.task.exhausted").counter()).isNotNull();
    }
}
