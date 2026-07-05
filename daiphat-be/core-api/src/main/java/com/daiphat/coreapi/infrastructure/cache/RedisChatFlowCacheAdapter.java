package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.chat.ChatFlowCachePayload;
import com.daiphat.coreapi.application.port.out.chat.ChatFlowCachePort;
import com.daiphat.coreapi.application.port.out.chat.keys.ChatCacheKeyGenerator;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisChatFlowCacheAdapter implements ChatFlowCachePort {

    private final RedisClient redisClient;

    @Override
    public List<PendingFlowState> loadFlows(Long conversationId) {
        if (conversationId == null) {
            return List.of();
        }
        try {
            return redisClient.get(ChatCacheKeyGenerator.activeFlows(conversationId), ChatFlowCachePayload.class)
                    .map(ChatFlowCachePayload::flows)
                    .filter(flows -> flows != null && !flows.isEmpty())
                    .orElseGet(Collections::emptyList);
        } catch (Exception exception) {
            log.warn(
                    "Redis unavailable while loading chat flows for conversation {} — treating as empty: {}",
                    conversationId,
                    exception.getMessage()
            );
            return List.of();
        }
    }

    @Override
    public void saveFlows(Long conversationId, List<PendingFlowState> flows, Duration ttl) {
        if (conversationId == null) {
            return;
        }
        if (flows == null || flows.isEmpty()) {
            deleteFlows(conversationId);
            return;
        }
        try {
            redisClient.set(
                    ChatCacheKeyGenerator.activeFlows(conversationId),
                    new ChatFlowCachePayload(List.copyOf(flows)),
                    ttl
            );
        } catch (Exception exception) {
            log.warn(
                    "Redis unavailable while saving chat flows for conversation {} — chat continues without cached state: {}",
                    conversationId,
                    exception.getMessage()
            );
        }
    }

    @Override
    public void deleteFlows(Long conversationId) {
        if (conversationId == null) {
            return;
        }
        try {
            redisClient.delete(ChatCacheKeyGenerator.activeFlows(conversationId));
        } catch (Exception exception) {
            log.warn(
                    "Redis unavailable while deleting chat flows for conversation {}: {}",
                    conversationId,
                    exception.getMessage()
            );
        }
    }
}
