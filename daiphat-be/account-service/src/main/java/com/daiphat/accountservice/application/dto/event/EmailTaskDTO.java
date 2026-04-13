package com.daiphat.accountservice.application.dto.event;

import com.daiphat.accountservice.domain.model.enums.EmailPriority;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;

/**
 * Message DTO for asynchronous email notification tasks via RabbitMQ.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailTaskDTO implements Serializable {
    
    /**
     * Unique ID for tracking and idempotency.
     */
    private String id;
    
    /**
     * The type of email to send (Determines the strategy and template).
     */
    private EmailType type;
    
    /**
     * Recipient email address.
     */
    private String to;
    
    /**
     * Dynamic template parameters (e.g., username, token, otp).
     */
    private Map<String, Object> parameters;
    
    /**
     * Timestamp when the task was generated.
     */
    private long timestamp;

    /**
     * Current attempt count for retry logic.
     */
    private int attempt;

    /**
     * Maximum number of retries allowed before moving to DLQ.
     */
    private int maxRetries;

    /**
     * Priority level for processing.
     */
    private EmailPriority priority;

    /**
     * Scheduled time for processing (used for backoff delays).
     */
    private long scheduledTime;

    /**
     * Increment the attempt count.
     */
    public void incrementAttempt() {
        this.attempt++;
    }
}
