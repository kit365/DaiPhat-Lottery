package com.daiphat.coreapi.domain.model.chat;

import lombok.Builder;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Builder
public record PendingFlowState(
        String flowId,
        String intent,
        String pendingSlot,
        Map<String, String> collectedSlots,
        Instant createdAt,
        Instant lastTouchedAt,
        int reentryCount
) {

    public static PendingFlowState create(String intent) {
        Instant now = Instant.now();
        return PendingFlowState.builder()
                .flowId(UUID.randomUUID().toString())
                .intent(intent)
                .collectedSlots(new HashMap<>())
                .createdAt(now)
                .lastTouchedAt(now)
                .reentryCount(0)
                .build();
    }

    public PendingFlowState withPendingSlot(String newSlot) {
        return new PendingFlowState(
                flowId,
                intent,
                newSlot,
                collectedSlots != null ? new HashMap<>(collectedSlots) : new HashMap<>(),
                createdAt,
                Instant.now(),
                reentryCount
        );
    }

    public PendingFlowState withCollectedSlots(Map<String, String> newSlots) {
        return new PendingFlowState(
                flowId,
                intent,
                pendingSlot,
                newSlots != null ? new HashMap<>(newSlots) : new HashMap<>(),
                createdAt,
                Instant.now(),
                reentryCount
        );
    }

    public PendingFlowState touch(String newSlot, Map<String, String> newSlots) {
        return new PendingFlowState(
                flowId,
                intent,
                newSlot != null ? newSlot : pendingSlot,
                newSlots != null ? new HashMap<>(newSlots) : collectedSlots != null ? new HashMap<>(collectedSlots) : new HashMap<>(),
                createdAt,
                Instant.now(),
                reentryCount + 1
        );
    }

    public Map<String, String> mutableCollectedSlots() {
        if (collectedSlots == null) {
            return new HashMap<>();
        }
        return collectedSlots;
    }
}
