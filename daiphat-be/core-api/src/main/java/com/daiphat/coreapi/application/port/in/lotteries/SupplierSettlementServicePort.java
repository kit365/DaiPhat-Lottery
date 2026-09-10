package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.AddSettlementMonetaryAdjustmentRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CompleteSettlementReconciliationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmSettlementMatchingRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveImportDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveReturnDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveUnitPriceDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementCompleteResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementResolvableSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementAdjustmentResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SupplierSettlementServicePort {

    /**
     * Find existing settlement for supplier + draw date (periodFrom), or create one.
     */
    SupplierSettlementModel findOrCreateForImport(LotterySupplierModel supplier, LocalDate drawDate);

    /**
     * Recalculate totalImportValue from imported line quantities linked to this settlement.
     * Also refreshes remainingAmount (inspection-gated IN_STOCK/GOOD payable).
     */
    void recalculateTotalImportValue(Long settlementId);

    /**
     * Recalculate totalReturnValue from tickets prepared for return
     * (linked via returnBatchLineId), not only after full SUCCESS handover.
     * Also refreshes remainingAmount (inspection-gated IN_STOCK/GOOD payable).
     */
    void recalculateTotalReturnValue(Long settlementId);

    /**
     * Recalculate import + return + remaining in one pass (avoids duplicate loads).
     */
    void recalculateAmounts(Long settlementId);

    /**
     * Scan open settlements past supplier returnCutOffTime and mark isReturnExpired = true,
     * so return tickets are forfeited and full import value is payable.
     */
    int updateExpiredSettlements();

    /**
     * Transition OPEN settlements past supplier {@code paymentCutOffTime} that are still
     * unfinished (not COMPLETED) to RECEIPT_OVERDUE and notify admins of late payment.
     * and notify Admin once (idempotent via status gate).
     */
    int markReceiptOverdueSettlements();

    PageResponse<SupplierSettlementResponse> getAll(
            int page,
            int size,
            Long lotterySupplierId,
            SupplierSettlementStatus status,
            LocalDate periodFrom,
            LocalDate periodTo,
            String search,
            String sortBy,
            String direction
    );

    SupplierSettlementResponse getById(Long id);

    /**
     * Full read-only overview: settlement header, KPIs, linked batches, inventory by station.
     */
    SupplierSettlementOverviewResponse getOverview(Long id);

    /**
     * Update settlement-level receipt/evidence URL (independent from return-batch returnEvidenceUrl).
     * Empty/blank clears the field (persisted as null).
     */
    SupplierSettlementResponse updateReceiptUrl(Long settlementId, String supplierSettlementReceiptUrl);

    /**
     * Replace the list of photos proving the supplier has been paid.
     * Empty list clears all evidence. Not allowed after the settlement is COMPLETED (paid).
     */
    SupplierSettlementResponse updatePaymentEvidenceUrls(Long settlementId, List<String> paymentEvidenceUrls);

    SupplierSettlementResponse confirmMatching(
            Long settlementId,
            ConfirmSettlementMatchingRequest request,
            UUID actorId
    );

    List<SettlementResolvableSerialResponse> listMissingReturnTickets(Long settlementId);

    List<SettlementResolvableSerialResponse> listImportResolvableTickets(Long settlementId);

    SettlementImportFileCheckResponse checkImportFiles(Long settlementId);

    SupplierSettlementResponse resolveImportDiscrepancy(
            Long settlementId,
            ResolveImportDiscrepancyRequest request,
            UUID actorId
    );

    SupplierSettlementResponse resolveReturnDiscrepancy(
            Long settlementId,
            ResolveReturnDiscrepancyRequest request,
            UUID actorId
    );

    SupplierSettlementResponse resolveUnitPriceDiscrepancy(
            Long settlementId,
            ResolveUnitPriceDiscrepancyRequest request,
            UUID actorId
    );

    SupplierSettlementAdjustmentResponse addSettlementMonetaryAdjustment(
            Long settlementId,
            AddSettlementMonetaryAdjustmentRequest request,
            UUID actorId
    );

    SupplierSettlementResponse recalculateReconciliation(Long settlementId, UUID actorId);

    SettlementCompleteResultResponse completeReconciliation(
            Long settlementId,
            CompleteSettlementReconciliationRequest request,
            UUID actorId
    );
}
