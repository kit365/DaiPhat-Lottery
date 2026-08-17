package com.daiphat.coreapi.application.dto.request.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Final physical handover decision. A rejection is an audit event only; it does
 * not return the paid serial to stock or create a refund automatically.
 */
public record ConfirmOrderHandoverRequest(
        @NotEmpty List<@Valid OrderHandoverItemRequest> items,
        String handoverEvidenceUrl
) {
}
