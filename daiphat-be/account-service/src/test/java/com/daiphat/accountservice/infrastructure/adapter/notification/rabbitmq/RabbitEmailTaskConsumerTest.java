package com.daiphat.accountservice.infrastructure.adapter.notification.rabbitmq;

import com.daiphat.accountservice.application.dto.event.EmailTask;
import com.daiphat.accountservice.application.port.in.mail.EmailServicePort;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RabbitEmailTaskConsumerTest {

    @Mock
    private EmailServicePort emailService;

    @InjectMocks
    private RabbitEmailTaskConsumer consumer;

    @Test
    @DisplayName("CONSUMER: Chuyển tiếp exception để RabbitMQ kích hoạt DLQ")
    void consumeEmailTask_RethrowsExceptionForDLQ() {
        EmailTask task = EmailTask.builder()
                .id("test-id")
                .type(EmailType.WELCOME_VERIFY)
                .build();

        // Giả lập EmailService ném exception (sau khi đã xử lý retry logic bên trong)
        doThrow(new RuntimeException("Task exhausted and failed"))
                .when(emailService).processAsyncEmail(any(EmailTask.class));

        // Verify: Consumer phải ném ngược lại exception ra ngoài
        assertThatThrownBy(() -> consumer.consumeEmailTask(task))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Task exhausted and failed");

        verify(emailService).processAsyncEmail(task);
    }
}
