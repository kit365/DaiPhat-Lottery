package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.SettlementDiscrepancyItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import org.springframework.stereotype.Component;

@Component
public class SupplierSettlementApplicationMapper {

    public SupplierSettlementResponse toResponse(SupplierSettlementModel model) {
        if (model == null) {
            return null;
        }
        SupplierSettlementReconciliationPhase phase = model.getReconciliationPhase() != null
                ? model.getReconciliationPhase()
                : SupplierSettlementReconciliationPhase.MATCHING;
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
                .build();
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
