package com.daiphat.coreapi.application.event;

import java.util.UUID;

/** Published only after a customer proof reaches durable storage and the order is locked for review. */
public record OrderPaymentComplaintSubmittedEvent(UUID orderId, String orderCode) {
}
