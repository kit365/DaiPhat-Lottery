package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.chat.ConversationServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatConversationTimeoutScheduler {

    private final ConversationServicePort conversationServicePort;

    @Scheduled(fixedRateString = "${daiphat.chat.conversation.timeout.scheduler-rate-ms}")
    public void expireTimedOutConversations() {
        int expiredCount = conversationServicePort.expireTimedOutConversations();
        if (expiredCount > 0) {
            log.info("Auto-closed {} timed-out chat conversations", expiredCount);
        }
    }
}
