package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Spam escalate cooldown — defaults under {@code daiphat.chat.spam} in application.yml.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.spam")
public class ChatSpamProperties {

    /** Tier A: block escalate after any SPAM close within this window. */
    private long softCooldownMinutes = 60;

    /** Tier B: number of SPAM closes in the sliding window that triggers longer cooldown. */
    private int repeatThreshold = 3;

    /** Sliding window used to count SPAM closes for Tier B. */
    private long repeatWindowHours = 24;

    /** Tier B cooldown length from the latest SPAM close. */
    private long repeatCooldownHours = 24;
}
