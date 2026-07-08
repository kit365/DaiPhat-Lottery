package com.daiphat.coreapi.application.dto.chat.account;

import com.daiphat.coreapi.application.dto.response.order.OrderResponse;

public sealed interface ChatAccountLookupOutcome {

    record NoOrders() implements ChatAccountLookupOutcome {
    }

    record LatestOrderFound(OrderResponse order) implements ChatAccountLookupOutcome {
    }

    record LookupFailed(Throwable error) implements ChatAccountLookupOutcome {
    }
}
