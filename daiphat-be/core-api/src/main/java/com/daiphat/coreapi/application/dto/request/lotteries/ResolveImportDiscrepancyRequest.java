package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentReasonCode;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/**
 * Resolve import discrepancy.
 * <ul>
 *   <li>{@code serialIds} + {@code ticketCondition} — fault existing IN_STOCK serials</li>
 *   <li>{@code missingPlaceholders} + {@code ticketCondition} — create ADJUSTMENT placeholders
 *       (LOST / DAMAGED / VOIDED / UNDER_IMPORTED); {@code damagedEvidenceUrl} required when DAMAGED</li>
 *   <li>{@code excessTickets} — create ADJUSTMENT batch GOOD sellable inventory</li>
 *   <li>value-only when serial lists empty + {@code adjustmentAmount}</li>
 * </ul>
 */
public record ResolveImportDiscrepancyRequest(
        List<Long> serialIds,
        /** DAMAGED / LOST / VOIDED / UNDER_IMPORTED for existing serials or missing placeholders. */
        TicketCondition ticketCondition,
        @NotNull SupplierSettlementAdjustmentReasonCode reasonCode,
        BigDecimal adjustmentAmount,
        String note,
        boolean markResolved,
        @Valid List<SettlementImportPlaceholderRequest> missingPlaceholders,
        @Valid List<SettlementExcessImportTicketRequest> excessTickets,
        /** Required when ticketCondition is DAMAGED (shared evidence for placeholders / serials). */
        String damagedEvidenceUrl
) {
}
