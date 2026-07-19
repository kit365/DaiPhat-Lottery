package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.List;

/**
 * Redis payload for active chat flows.
 * <p>
 * Must carry an explicit {@code @class} type id: {@link PendingFlowState} and this payload are
 * Java records (final), so {@code ObjectMapper.DefaultTyping.NON_FINAL} alone would omit the id
 * and Redis deserialization would fail silently — wiping pending slots such as ticket match mode.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, property = "@class")
public record ChatFlowCachePayload(List<PendingFlowState> flows) {
}
