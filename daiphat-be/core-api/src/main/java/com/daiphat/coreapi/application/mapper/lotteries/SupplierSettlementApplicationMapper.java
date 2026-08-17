package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.SettlementDiscrepancyItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.StationCommissionSnapshotResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.SupplierPaymentCutOffCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
public class SupplierSettlementApplicationMapper {

    private final SupplierPaymentCutOffCalculator paymentCutOffCalculator;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final Clock clock;

    public SupplierSettlementResponse toResponse(SupplierSettlementModel model) {
        if (model == null) {
            return null;
        }
        SupplierSettlementReconciliationPhase phase = model.getReconciliationPhase() != null
                ? model.getReconciliationPhase()
                : SupplierSettlementReconciliationPhase.MATCHING;

        int bufferMinutes = paymentCutOffCalculator.resolveSettlementBufferMinutes();
        LocalTime paymentCutOff = null;
        if (model.getLotterySupplierId() != null) {
            paymentCutOff = lotterySupplierRepositoryPort.findById(model.getLotterySupplierId())
                    .map(LotterySupplierModel::getPaymentCutOffTime)
                    .orElse(null);
        }
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime windowStart = paymentCutOffCalculator.reconciliationWindowStartAt(
                model.getPeriodFrom(),
                paymentCutOff
        );
        boolean inWindow = paymentCutOff != null
                && paymentCutOffCalculator.isReconciliationWindowOpen(
                        model.getPeriodFrom(),
                        paymentCutOff,
                        now
                );

        return SupplierSettlementResponse.builder()
                .id(model.getId())
                .lotterySupplierId(model.getLotterySupplierId())
                .supplierName(model.getSupplierName())
                .supplierCode(model.getSupplierCode())
                .periodFrom(model.getPeriodFrom())
                .periodTo(model.getPeriodTo())
                .supplierSettlementCode(model.getSupplierSettlementCode())
                .totalImportValue(model.getTotalImportValue())
                .totalReturnValue(model.getTotalReturnValue())
                .totalPaidAmount(model.getTotalPaidAmount())
                .remainingAmount(model.getRemainingAmount())
                .supplierSettlementReceiptUrl(model.getSupplierSettlementReceiptUrl())
                .paymentEvidenceUrls(model.getPaymentEvidenceUrls() == null
                        ? java.util.List.of()
                        : java.util.List.copyOf(model.getPaymentEvidenceUrls()))
                .isReturnExpired(model.isReturnExpired())
                .expiredReturnValue(model.getExpiredReturnValue())
                .status(model.getStatus())
                .statusLabel(model.getStatus() != null ? model.getStatus().getLabel() : null)
                .reconciliationPhase(phase)
                .reconciliationPhaseLabel(phase.getLabel())
                .systemImportQuantity(model.getSystemImportQuantity())
                .systemImportValue(model.getSystemImportValue())
                .systemReturnQuantity(model.getSystemReturnQuantity())
                .systemReturnValue(model.getSystemReturnValue())
                .actualTicketImportQuantity(model.getActualTicketImportQuantity())
                .actualTicketImportValue(model.getActualTicketImportValue())
                .actualReturnTicketQuantity(model.getActualReturnTicketQuantity())
                .actualReturnTicketValue(model.getActualReturnTicketValue())
                .originalTicketUnitPrice(model.getOriginalTicketUnitPrice())
                .reconciledTicketUnitPrice(model.getReconciledTicketUnitPrice())
                .actualTicketPrice(model.getReconciledTicketUnitPrice())
                .systemTicketImportPrice(model.getSystemTicketImportPrice())
                .actualTicketImportPrice(model.getActualTicketImportPrice())
                .stationCommissionSnapshots(toStationCommissionResponses(model))
                .initialEstimatedSettlementValue(model.getInitialEstimatedSettlementValue())
                .finalSettlementValue(model.getFinalSettlementValue())
                .actualPaidAmount(model.getActualPaidAmount())
                .settlementDifferenceAmount(model.getSettlementDifferenceAmount())
                .discrepancyTypes(model.getDiscrepancyTypes() != null
                        ? model.getDiscrepancyTypes()
                        : java.util.List.of())
                .discrepancyItems(toDiscrepancyItemResponses(model))
                .importQuantityMismatch(model.isImportQuantityMismatch())
                .importValueMismatch(model.isImportValueMismatch())
                .returnQuantityMismatch(model.isReturnQuantityMismatch())
                .returnValueMismatch(model.isReturnValueMismatch())
                .importDiscrepancyResolved(model.isImportDiscrepancyResolved())
                .returnDiscrepancyResolved(model.isReturnDiscrepancyResolved())
                .unitPriceDiscrepancyResolved(model.isUnitPriceDiscrepancyResolved())
                .recalculatedTotalPaidAmount(model.getRecalculatedTotalPaidAmount())
                .reconciliationNote(model.getReconciliationNote())
                .matchingConfirmedAt(model.getMatchingConfirmedAt())
                .matchingConfirmedBy(model.getMatchingConfirmedBy())
                .completedAt(model.getCompletedAt())
                .completedBy(model.getCompletedBy())
                .transactionId(model.getTransactionId())
                .paidAt(model.getPaidAt())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .settlementBufferMinutes(bufferMinutes)
                .paymentCutOffTime(paymentCutOff)
                .reconciliationWindowStartAt(windowStart)
                .inReconciliationWindow(inWindow)
                .build();
    }

    private java.util.List<StationCommissionSnapshotResponse> toStationCommissionResponses(
            SupplierSettlementModel model
    ) {
        if (model.getStationCommissionSnapshots() == null || model.getStationCommissionSnapshots().isEmpty()) {
            return java.util.List.of();
        }
        return model.getStationCommissionSnapshots().stream()
                .filter(java.util.Objects::nonNull)
                .filter(item -> item.getLotteryStationId() != null)
                .map(item -> StationCommissionSnapshotResponse.builder()
                        .lotteryStationId(item.getLotteryStationId())
                        .importedQuantity(item.getImportedQuantity())
                        .systemCommissionRate(item.getSystemCommissionRate())
                        .actualCommissionRate(item.getActualCommissionRate())
                        .build())
                .toList();
    }

    private java.util.List<SettlementDiscrepancyItemResponse> toDiscrepancyItemResponses(SupplierSettlementModel model) {
        java.util.List<com.daiphat.coreapi.domain.model.lotteries.SettlementDiscrepancyItem> items =
                model.getDiscrepancyItems();
        if (items == null || items.isEmpty()) {
            items = com.daiphat.coreapi.domain.model.lotteries.SettlementDiscrepancyItem.fromMatching(
                    model.getSystemImportQuantity(),
                    model.getActualTicketImportQuantity(),
                    model.getSystemReturnQuantity(),
                    model.getActualReturnTicketQuantity(),
                    model.getOriginalTicketUnitPrice(),
                    model.getReconciledTicketUnitPrice()
            );
        }
        if (items == null || items.isEmpty()) {
            return java.util.List.of();
        }
        return items.stream()
                .filter(java.util.Objects::nonNull)
                .filter(item -> item.getType() != null && item.getDirection() != null)
                .map(item -> SettlementDiscrepancyItemResponse.builder()
                        .type(item.getType())
                        .typeLabel(item.getType().getLabel())
                        .direction(item.getDirection())
                        .directionLabel(item.getDirection().getLabel())
                        .difference(item.getDifference())
                        .unit(item.getUnit())
                        .build())
                .toList();
    }
}
