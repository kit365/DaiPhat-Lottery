package com.daiphat.accountservice.infrastructure.adapter.notification.rabbitmq;

import com.daiphat.accountservice.application.dto.event.EmailTaskDTO;
import com.daiphat.accountservice.infrastructure.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * Adapter gửi nhiệm vụ Email vào RabbitMQ.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RabbitEmailTaskProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * Gửi task email vào RabbitMQ exchange.
     * 
     * @param task Thông tin email cần gửi.
     */
    public void sendEmailTask(EmailTaskDTO task) {
        log.info("Sending email task to RabbitMQ. Type: {}, To: {}", task.getType(), task.getTo());
        
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EMAIL_EXCHANGE, 
                RabbitMQConfig.EMAIL_ROUTING_KEY, 
                task
        );
        log.debug("Email task successfully sent to RabbitMQ for recipient: {}", task.getTo());
    }

    /**
     * Gửi task email vào hàng đợi retry với thời gian chờ.
     * 
     * @param task Thông tin email cần gửi lại.
     * @param delaySeconds Số giây cần chờ trước khi xử lý lại.
     */
    public void sendDelayedEmailTask(EmailTaskDTO task, long delaySeconds) {
        log.info("Enqueuing email task to retry queue. Type: {}, To: {}, Delay: {}s", 
            task.getType(), task.getTo(), delaySeconds);
        
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EMAIL_RETRY_EXCHANGE, 
                RabbitMQConfig.EMAIL_RETRY_ROUTING_KEY, 
                task,
                message -> {
                    message.getMessageProperties().setExpiration(String.valueOf(delaySeconds * 1000));
                    return message;
                }
        );
    }
}
