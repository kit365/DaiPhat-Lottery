package com.daiphat.accountservice.infrastructure.adapter.notification.rabbitmq;

import com.daiphat.accountservice.application.dto.event.EmailTask;
import com.daiphat.accountservice.application.port.in.mail.EmailServicePort;
import com.daiphat.accountservice.infrastructure.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumer lắng nghe các nhiệm vụ Email từ RabbitMQ.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RabbitEmailTaskConsumer {

    private final EmailServicePort emailService;

    /**
     * Lắng nghe và xử lý task từ email queue.
     * 
     * @param task DTO chứa thông tin email cần gửi.
     */
    @RabbitListener(queues = RabbitMQConfig.EMAIL_QUEUE)
    public void consumeEmailTask(EmailTask task) {
        log.info("Received email task {} from RabbitMQ. Type: {}, Attempt: {}", 
                task.getId(), task.getType(), task.getAttempt());
        
        try {
            // Điều phối xử lý async (Render + Send) qua EmailService
            emailService.processAsyncEmail(task);
            log.debug("Async email task {} processed successfully", task.getId());
        } catch (Exception e) {
            log.error("Error processing email task {} from RabbitMQ: {}", task.getId(), e.getMessage());
            // Ném ngoại lệ để RabbitMQ xử lý (Requeue hoặc đưa vào DLQ dựa trên config)
            throw e;
        }
    }
}
