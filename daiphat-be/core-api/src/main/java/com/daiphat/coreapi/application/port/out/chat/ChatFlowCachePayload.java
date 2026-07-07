package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.PendingFlowState;

import java.util.List;

public record ChatFlowCachePayload(List<PendingFlowState> flows) {
}
