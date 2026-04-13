package com.daiphat.accountservice.application.service;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.event.EmailTaskDTO;
import com.daiphat.accountservice.application.port.in.EmailServicePort;
import com.daiphat.accountservice.domain.exception.EmailDispatchException;
import com.daiphat.accountservice.domain.exception.EmailRateLimitException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.enums.EmailPriority;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import com.daiphat.accountservice.infrastructure.adapter.notification.rabbitmq.RabbitEmailTaskProducer;
import com.daiphat.accountservice.application.strategy.email.EmailStrategy;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service trung tâm điều phối gửi Email (Email Dispatcher).
 * Bản Pro Max: Tích hợp Resilience (Retries, Backoff), Observability (Metrics) và Hardened Error Handling.
 */
@Service
@Slf4j
public class EmailService implements EmailServicePort {

    private final RabbitEmailTaskProducer rabbitEmailTaskProducer;
    private final AuthProperties authProperties;
    private final MeterRegistry meterRegistry;
    private final Map<EmailType, EmailStrategy> strategyMap = new ConcurrentHashMap<>();

    public EmailService(List<EmailStrategy> strategies, 
                        RabbitEmailTaskProducer rabbitEmailTaskProducer,
                        AuthProperties authProperties,
                        MeterRegistry meterRegistry) {
        this.rabbitEmailTaskProducer = rabbitEmailTaskProducer;
        this.authProperties = authProperties;
        this.meterRegistry = meterRegistry;
        strategies.forEach(strategy -> strategyMap.put(strategy.getSupportedType(), strategy));
        log.info("EmailService (PRO MAX) initialized with {} strategies and Micrometer monitoring", strategyMap.size());
    }

    // ENQUEUE -> de vao queue để gửi mail
    @Override
    public void sendEmail(EmailType type, String recipient, Map<String, Object> data) {
        EmailStrategy strategy = strategyMap.get(type);
        if (strategy == null) {
            meterRegistry.counter("email.dispatch.error", "type", type.name(), "reason", "no_strategy").increment();
            throw new EmailDispatchException(ErrorCode.INTERNAL_SERVER_ERROR, "No strategy registered for type: " + type);
        }

        // 1. Proactive Rate Limiting (Bọc thép tại Source - Interface driven)
        if (!strategy.checkRateLimit(recipient)) {
            meterRegistry.counter("email.rate_limit.triggered", "type", type.name()).increment();
            throw new EmailRateLimitException(recipient, type, "Rate limit exceeded for " + type);
        }

        try {
            log.info("Producing async email task [{}] to RabbitMQ for: {}", type, recipient);
            
            EmailTaskDTO task = EmailTaskDTO.builder()
                    .id(UUID.randomUUID().toString())
                    .type(type)
                    .to(recipient)
                    .parameters(data)
                    .timestamp(System.currentTimeMillis())
                    .attempt(0)
                    .maxRetries(authProperties.getEmail().getMaxRetries())
                    .priority(EmailPriority.NORMAL)
                    .scheduledTime(System.currentTimeMillis())
                    .build();
            
            rabbitEmailTaskProducer.sendEmailTask(task);
            meterRegistry.counter("email.task.produced", "type", type.name()).increment();
            
        } catch (Exception e) {
            log.error("Failed to produce email task for {}: {}", recipient, e.getMessage());
            meterRegistry.counter("email.task.failed", "type", type.name()).increment();
            throw new EmailDispatchException(ErrorCode.INTERNAL_SERVER_ERROR, e);
        }
    }

    @Override
    public void sendAsync(EmailType type, String recipient, Map<String, Object> data) {
        try {
            this.sendEmail(type, recipient, data);
        } catch (Exception e) {
            log.warn("Secondary Action: Silent failure in email dispatch for {}, error: {}", recipient, e.getMessage());
            meterRegistry.counter("email.task.silent_failure", "type", type.name()).increment();
        }
    }

    // chính thức gửi
    @Override
    public void processAsyncEmail(EmailTaskDTO task) {
        Timer.Sample sample = Timer.start(meterRegistry);
        EmailType type = task.getType();
        
        try {
            EmailStrategy strategy = strategyMap.get(type);
            if (strategy == null) {
                log.error("Consumer Critical: No strategy found for type {}", type);
                return;
            }

            log.info("Executing async task {} (Attempt {}/{}) for {}", task.getId(), task.getAttempt() + 1, task.getMaxRetries(), task.getTo());
            strategy.process(task.getTo(), task.getParameters());
            
            sample.stop(meterRegistry.timer("email.task.processing", "type", type.name(), "status", "success"));
            log.info("Email task {} processed successfully", task.getId());

        } catch (Exception e) {
            sample.stop(meterRegistry.timer("email.task.processing", "type", type.name(), "status", "failure"));
            handleProcessingFailure(task, e);
        }
    }

    private void handleProcessingFailure(EmailTaskDTO task, Exception e) {
        int currentAttempt = task.getAttempt();
        int maxRetries = task.getMaxRetries();

        if (currentAttempt < maxRetries) {
            task.incrementAttempt();
            long backoff = calculateBackoff(currentAttempt);
            task.setScheduledTime(System.currentTimeMillis() + (backoff * 1000));
            
            log.warn("Email task {} failed, retrying (Attempt {}/{}) in {}s. Error: {}", 
                    task.getId(), task.getAttempt(), maxRetries, backoff, e.getMessage());
            
            // Re-queue task for retry
            rabbitEmailTaskProducer.sendEmailTask(task);
        } else {
            log.error("CRITICAL: Email task {} failed after {} attempts. Moving to DLQ logic. Error: {}", 
                    task.getId(), maxRetries, e.getMessage());
            meterRegistry.counter("email.task.exhausted", "type", task.getType().name()).increment();

        }
    }

    private long calculateBackoff(int attempt) {
        // Exponential backoff logic
        long initial = authProperties.getEmail().getInitialBackoff().getSeconds();
        long max = authProperties.getEmail().getMaxBackoff().getSeconds();
        return Math.min(max, initial * (long) Math.pow(2, attempt));
    }
}
