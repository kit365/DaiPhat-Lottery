package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationBatchModel;

import java.time.LocalDateTime;
import java.util.UUID;

public interface VendorSettlementProjectionServicePort {

    record ProjectionLinks(Long agentSettlementId, Long dailySalesReportId) {}

    /**
     * Idempotent side-effects of settle: AgentSettlement, DailySalesReport (+details), confidence.
     * Mutates {@code profile} confidence fields in memory; caller persists profile.
     */
    /**
     * Projects settlement, report and confidence from the same confirmed vendor-return
     * receipt. The receipt id is mandatory so an adapter cannot discard that traceability.
     */
    ProjectionLinks projectOnSettle(
            VendorAllocationBatchModel batch,
            StreetAgentProfileModel profile,
            UUID operatorId,
            LocalDateTime settledAt,
            Long returnBatchId);
}
