package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import org.springframework.stereotype.Component;

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
                .isReturnExpired(entity.isReturnExpired())
                .expiredReturnValue(entity.getExpiredReturnValue())
                .status(entity.getStatus())
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
                .isReturnExpired(model.isReturnExpired())
                .expiredReturnValue(model.getExpiredReturnValue())
                .status(model.getStatus())
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
        entity.setReturnExpired(model.isReturnExpired());
        entity.setExpiredReturnValue(model.getExpiredReturnValue());
        entity.setStatus(model.getStatus());
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
}
