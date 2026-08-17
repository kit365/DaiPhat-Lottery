package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailHandoverDecision;
import jakarta.validation.constraints.NotNull;

public record OrderHandoverItemRequest(
        @NotNull Long orderDetailId,
        @NotNull OrderDetailHandoverDecision decision,
        String reason
) {
}
