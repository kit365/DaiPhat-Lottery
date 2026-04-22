package com.daiphat.accountservice.application.dto.event;
import com.daiphat.accountservice.domain.model.enums.EmailPriority;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailTask implements Serializable {
    private String id;
    private EmailType type;
    private String to;
    private Map<String, Object> parameters;
    private long timestamp;
    private int attempt;
    private int maxRetries;
    private EmailPriority priority;
    private long scheduledTime;
    public void incrementAttempt() {
        this.attempt++;
    }
}
