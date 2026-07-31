package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.PendingFlowState;

import java.util.Collections;
import java.util.List;

/**
 * Result of loading chat flow state from cache.
 * {@code degraded=true} means Redis failed — callers must not invent slot answers from empty state.
 */
public record ChatFlowCacheLoadResult(List<PendingFlowState> flows, boolean degraded) {

    public static ChatFlowCacheLoadResult empty() {
        return new ChatFlowCacheLoadResult(Collections.emptyList(), false);
    }

    public static ChatFlowCacheLoadResult of(List<PendingFlowState> flows) {
        if (flows == null || flows.isEmpty()) {
            return empty();
        }
        return new ChatFlowCacheLoadResult(List.copyOf(flows), false);
    }

    public static ChatFlowCacheLoadResult degradedEmpty() {
        return new ChatFlowCacheLoadResult(Collections.emptyList(), true);
    }
}
