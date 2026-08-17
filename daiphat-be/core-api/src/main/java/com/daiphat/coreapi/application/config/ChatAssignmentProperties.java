package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.assignment")
public class ChatAssignmentProperties {

    /** Max live chats (ACTIVE / WAITING_FOR_CUSTOMER) per operator. Product default is 1. */
    private int maxConcurrentLive = 1;

    public int resolvedMaxConcurrentLive() {
        return Math.max(1, maxConcurrentLive);
    }
}
