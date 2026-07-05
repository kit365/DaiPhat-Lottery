package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cấu hình multi-flow chat — giá trị mặc định tại {@code daiphat.chat.flow} trong application.yml.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.flow")
public class ChatFlowProperties {

    private double switchIntentThreshold;
    private double slotFillMinConfidence;
    private long ttlMinutes;

    public Duration flowTtl() {
        return Duration.ofMinutes(ttlMinutes);
    }
}
