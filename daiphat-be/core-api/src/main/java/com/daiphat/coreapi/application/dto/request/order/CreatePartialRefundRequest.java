package com.daiphat.coreapi.application.dto.request.order;

import java.util.List;

/**
 * Partial refund creation payload.
 * Prefer {@code refundReason}; {@code refundNote} remains for older clients.
 */
public record CreatePartialRefundRequest(
        List<TicketIncidentItemRequest> incidents,
        String refundNote,
        String refundReason
) {
    public CreatePartialRefundRequest {
        if (refundReason != null) {
            refundReason = refundReason.trim();
            if (refundReason.isEmpty()) {
                refundReason = null;
            }
        }
    }

    /** Reason shown on the refund request; falls back to refundNote for older clients. */
    public String resolveRefundReason() {
        if (refundReason != null && !refundReason.isBlank()) {
            return refundReason.trim();
        }
        if (refundNote != null && !refundNote.isBlank()) {
            return refundNote.trim();
        }
        return null;
    }
}
