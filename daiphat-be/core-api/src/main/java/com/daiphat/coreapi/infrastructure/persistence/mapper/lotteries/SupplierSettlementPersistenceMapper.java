package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyDirection;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.lotteries.SettlementDiscrepancyItem;
import com.daiphat.coreapi.domain.model.lotteries.StationCommissionSnapshot;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SettlementDiscrepancyItemColumn;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class SupplierSettlementPersistenceMapper {

    public SupplierSettlementModel toDomain(SupplierSettlementEntity entity) {
        if (entity == null) {
            return null;
        }
        LotterySupplierEntity supplier = entity.getLotterySupplier();
        return SupplierSettlementModel.builder()
                .id(entity.getId())
                .lotterySupplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .supplierCode(supplier != null ? supplier.getCode() : null)
                .periodFrom(entity.getPeriodFrom())
                .periodTo(entity.getPeriodTo())
                .supplierSettlementCode(entity.getSupplierSettlementCode())
                .totalImportValue(entity.getTotalImportValue())
                .totalReturnValue(entity.getTotalReturnValue())
                .totalPaidAmount(entity.getTotalPaidAmount())
                .remainingAmount(entity.getRemainingAmount())
                .supplierSettlementReceiptUrl(entity.getSupplierSettlementReceiptUrl())
                .paymentEvidenceUrls(copyStringList(entity.getPaymentEvidenceUrls()))
                .isReturnExpired(entity.isReturnExpired())
                .expiredReturnValue(entity.getExpiredReturnValue())
                .status(entity.getStatus())
                .reconciliationPhase(entity.getReconciliationPhase() != null
                        ? entity.getReconciliationPhase()
                        : SupplierSettlementReconciliationPhase.MATCHING)
                .systemImportQuantity(entity.getSystemImportQuantity())
                .systemImportValue(entity.getSystemImportValue())
                .systemReturnQuantity(entity.getSystemReturnQuantity())
                .systemReturnValue(entity.getSystemReturnValue())
                .actualTicketImportQuantity(entity.getActualTicketImportQuantity())
                .actualTicketImportValue(entity.getActualTicketImportValue())
                .actualReturnTicketQuantity(entity.getActualReturnTicketQuantity())
                .actualReturnTicketValue(entity.getActualReturnTicketValue())
                .originalTicketUnitPrice(entity.getOriginalTicketUnitPrice())
                .reconciledTicketUnitPrice(entity.getReconciledTicketUnitPrice())
                .systemTicketImportPrice(entity.getSystemTicketImportPrice())
                .actualTicketImportPrice(entity.getActualTicketImportPrice())
                .stationCommissionSnapshots(copySnapshots(entity.getStationCommissionSnapshots()))
                .systemImportQuantityFrozenAt(entity.getSystemImportQuantityFrozenAt())
                .systemReturnQuantityFrozenAt(entity.getSystemReturnQuantityFrozenAt())
                .initialEstimatedSettlementValue(entity.getInitialEstimatedSettlementValue())
                .finalSettlementValue(entity.getFinalSettlementValue())
                .actualPaidAmount(entity.getActualPaidAmount())
                .settlementDifferenceAmount(entity.getSettlementDifferenceAmount())
                .discrepancyTypes(copyEnumList(entity.getDiscrepancyTypes()))
                .discrepancyItems(toDomainItems(entity.getDiscrepancyItems()))
                .importQuantityMismatch(entity.isImportQuantityMismatch())
                .importValueMismatch(entity.isImportValueMismatch())
                .returnQuantityMismatch(entity.isReturnQuantityMismatch())
                .returnValueMismatch(entity.isReturnValueMismatch())
                .importDiscrepancyResolved(entity.isImportDiscrepancyResolved())
                .returnDiscrepancyResolved(entity.isReturnDiscrepancyResolved())
                .unitPriceDiscrepancyResolved(entity.isUnitPriceDiscrepancyResolved())
                .recalculatedTotalPaidAmount(entity.getRecalculatedTotalPaidAmount())
                .reconciliationNote(entity.getReconciliationNote())
                .matchingConfirmedAt(entity.getMatchingConfirmedAt())
                .matchingConfirmedBy(entity.getMatchingConfirmedBy())
                .completedAt(entity.getCompletedAt())
                .completedBy(entity.getCompletedBy())
                .transactionId(entity.getTransactionId())
                .paidAt(entity.getPaidAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .deletedAt(entity.getDeletedAt())
                .build();
    }

    public SupplierSettlementEntity toEntity(SupplierSettlementModel model) {
        if (model == null) {
            return null;
        }
        LotterySupplierEntity supplier = null;
        if (model.getLotterySupplierId() != null) {
            supplier = new LotterySupplierEntity();
            supplier.setId(model.getLotterySupplierId());
        }
        return SupplierSettlementEntity.builder()
                .id(model.getId())
                .lotterySupplier(supplier)
                .periodFrom(model.getPeriodFrom())
                .periodTo(model.getPeriodTo())
                .supplierSettlementCode(model.getSupplierSettlementCode())
                .totalImportValue(model.getTotalImportValue())
                .totalReturnValue(model.getTotalReturnValue())
                .totalPaidAmount(model.getTotalPaidAmount())
                .remainingAmount(model.getRemainingAmount())
                .supplierSettlementReceiptUrl(model.getSupplierSettlementReceiptUrl())
                .paymentEvidenceUrls(copyStringList(model.getPaymentEvidenceUrls()))
                .isReturnExpired(model.isReturnExpired())
                .expiredReturnValue(model.getExpiredReturnValue())
                .status(model.getStatus())
                .reconciliationPhase(model.getReconciliationPhase() != null
                        ? model.getReconciliationPhase()
                        : SupplierSettlementReconciliationPhase.MATCHING)
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
                .systemTicketImportPrice(model.getSystemTicketImportPrice())
                .actualTicketImportPrice(model.getActualTicketImportPrice())
                .stationCommissionSnapshots(copySnapshots(model.getStationCommissionSnapshots()))
                .systemImportQuantityFrozenAt(model.getSystemImportQuantityFrozenAt())
                .systemReturnQuantityFrozenAt(model.getSystemReturnQuantityFrozenAt())
                .initialEstimatedSettlementValue(model.getInitialEstimatedSettlementValue())
                .finalSettlementValue(model.getFinalSettlementValue())
                .actualPaidAmount(model.getActualPaidAmount())
                .settlementDifferenceAmount(model.getSettlementDifferenceAmount())
                .discrepancyTypes(copyEnumList(model.getDiscrepancyTypes()))
                .discrepancyItems(toColumnItems(model.getDiscrepancyItems()))
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
                .createdBy(model.getCreatedBy())
                .lastModifiedBy(model.getLastModifiedBy())
                .deletedAt(model.getDeletedAt())
                .build();
    }

    public void updateEntityFromModel(SupplierSettlementModel model, SupplierSettlementEntity entity) {
        entity.setPeriodFrom(model.getPeriodFrom());
        entity.setPeriodTo(model.getPeriodTo());
        entity.setSupplierSettlementCode(model.getSupplierSettlementCode());
        entity.setTotalImportValue(model.getTotalImportValue());
        entity.setTotalReturnValue(model.getTotalReturnValue());
        entity.setTotalPaidAmount(model.getTotalPaidAmount());
        entity.setRemainingAmount(model.getRemainingAmount());
        entity.setSupplierSettlementReceiptUrl(model.getSupplierSettlementReceiptUrl());
        entity.setPaymentEvidenceUrls(copyStringList(model.getPaymentEvidenceUrls()));
        entity.setReturnExpired(model.isReturnExpired());
        entity.setExpiredReturnValue(model.getExpiredReturnValue());
        entity.setStatus(model.getStatus());
        entity.setReconciliationPhase(model.getReconciliationPhase() != null
                ? model.getReconciliationPhase()
                : SupplierSettlementReconciliationPhase.MATCHING);
        entity.setSystemImportQuantity(model.getSystemImportQuantity());
        entity.setSystemImportValue(model.getSystemImportValue());
        entity.setSystemReturnQuantity(model.getSystemReturnQuantity());
        entity.setSystemReturnValue(model.getSystemReturnValue());
        entity.setActualTicketImportQuantity(model.getActualTicketImportQuantity());
        entity.setActualTicketImportValue(model.getActualTicketImportValue());
        entity.setActualReturnTicketQuantity(model.getActualReturnTicketQuantity());
        entity.setActualReturnTicketValue(model.getActualReturnTicketValue());
        entity.setOriginalTicketUnitPrice(model.getOriginalTicketUnitPrice());
        entity.setReconciledTicketUnitPrice(model.getReconciledTicketUnitPrice());
        entity.setSystemTicketImportPrice(model.getSystemTicketImportPrice());
        entity.setActualTicketImportPrice(model.getActualTicketImportPrice());
        entity.setStationCommissionSnapshots(copySnapshots(model.getStationCommissionSnapshots()));
        entity.setSystemImportQuantityFrozenAt(model.getSystemImportQuantityFrozenAt());
        entity.setSystemReturnQuantityFrozenAt(model.getSystemReturnQuantityFrozenAt());
        entity.setInitialEstimatedSettlementValue(model.getInitialEstimatedSettlementValue());
        entity.setFinalSettlementValue(model.getFinalSettlementValue());
        entity.setActualPaidAmount(model.getActualPaidAmount());
        entity.setSettlementDifferenceAmount(model.getSettlementDifferenceAmount());
        entity.setDiscrepancyTypes(copyEnumList(model.getDiscrepancyTypes()));
        entity.setDiscrepancyItems(toColumnItems(model.getDiscrepancyItems()));
        entity.setImportQuantityMismatch(model.isImportQuantityMismatch());
        entity.setImportValueMismatch(model.isImportValueMismatch());
        entity.setReturnQuantityMismatch(model.isReturnQuantityMismatch());
        entity.setReturnValueMismatch(model.isReturnValueMismatch());
        entity.setImportDiscrepancyResolved(model.isImportDiscrepancyResolved());
        entity.setReturnDiscrepancyResolved(model.isReturnDiscrepancyResolved());
        entity.setUnitPriceDiscrepancyResolved(model.isUnitPriceDiscrepancyResolved());
        entity.setRecalculatedTotalPaidAmount(model.getRecalculatedTotalPaidAmount());
        entity.setReconciliationNote(model.getReconciliationNote());
        entity.setMatchingConfirmedAt(model.getMatchingConfirmedAt());
        entity.setMatchingConfirmedBy(model.getMatchingConfirmedBy());
        entity.setCompletedAt(model.getCompletedAt());
        entity.setCompletedBy(model.getCompletedBy());
        entity.setTransactionId(model.getTransactionId());
        entity.setPaidAt(model.getPaidAt());
        entity.setDeletedAt(model.getDeletedAt());
        if (model.getLotterySupplierId() != null
                && (entity.getLotterySupplier() == null
                || !model.getLotterySupplierId().equals(entity.getLotterySupplier().getId()))) {
            LotterySupplierEntity supplier = new LotterySupplierEntity();
            supplier.setId(model.getLotterySupplierId());
            entity.setLotterySupplier(supplier);
        }
    }

    private static List<String> copyStringList(List<String> source) {
        return source == null ? new ArrayList<>() : new ArrayList<>(source);
    }

    private static List<StationCommissionSnapshot> copySnapshots(List<StationCommissionSnapshot> source) {
        if (source == null || source.isEmpty()) {
            return new ArrayList<>();
        }
        List<StationCommissionSnapshot> copies = new ArrayList<>();
        for (StationCommissionSnapshot snapshot : source) {
            if (snapshot == null || snapshot.getLotteryStationId() == null) {
                continue;
            }
            copies.add(StationCommissionSnapshot.builder()
                    .lotteryStationId(snapshot.getLotteryStationId())
                    .importedQuantity(snapshot.getImportedQuantity())
                    .systemCommissionRate(snapshot.getSystemCommissionRate())
                    .actualCommissionRate(snapshot.getActualCommissionRate())
                    .build());
        }
        return copies;
    }

    private static List<SupplierSettlementDiscrepancyType> copyEnumList(
            List<SupplierSettlementDiscrepancyType> source
    ) {
        return source == null ? new ArrayList<>() : new ArrayList<>(source);
    }

    private static List<SettlementDiscrepancyItem> toDomainItems(List<SettlementDiscrepancyItemColumn> columns) {
        List<SettlementDiscrepancyItem> items = new ArrayList<>();
        if (columns == null) {
            return items;
        }
        for (SettlementDiscrepancyItemColumn column : columns) {
            if (column == null || column.getType() == null || column.getDirection() == null) {
                continue;
            }
            try {
                items.add(SettlementDiscrepancyItem.builder()
                        .type(SupplierSettlementDiscrepancyType.valueOf(column.getType()))
                        .direction(SupplierSettlementDiscrepancyDirection.valueOf(column.getDirection()))
                        .difference(column.getDifference())
                        .unit(column.getUnit())
                        .build());
            } catch (IllegalArgumentException ignored) {
                // Skip rows persisted with an unknown type/direction.
            }
        }
        return items;
    }

    private static List<SettlementDiscrepancyItemColumn> toColumnItems(List<SettlementDiscrepancyItem> items) {
        List<SettlementDiscrepancyItemColumn> columns = new ArrayList<>();
        if (items == null) {
            return columns;
        }
        for (SettlementDiscrepancyItem item : items) {
            if (item == null || item.getType() == null || item.getDirection() == null) {
                continue;
            }
            columns.add(new SettlementDiscrepancyItemColumn(
                    item.getType().name(),
                    item.getDirection().name(),
                    item.getDifference(),
                    item.getUnit()
            ));
        }
        return columns;
    }
}
