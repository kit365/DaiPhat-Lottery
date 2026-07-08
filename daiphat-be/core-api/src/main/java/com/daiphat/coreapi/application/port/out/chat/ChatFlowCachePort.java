package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.PendingFlowState;

import java.time.Duration;
import java.util.List;

public interface ChatFlowCachePort {

    List<PendingFlowState> loadFlows(Long conversationId);

    void saveFlows(Long conversationId, List<PendingFlowState> flows, Duration ttl);

    void deleteFlows(Long conversationId);
}
