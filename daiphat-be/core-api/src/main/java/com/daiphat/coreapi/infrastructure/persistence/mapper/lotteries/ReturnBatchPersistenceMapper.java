package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchLineEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ReturnBatchPersistenceMapper {

    public ReturnBatchModel toDomain(ReturnBatchEntity entity) {
        if (entity == null) {
            return null;
        }
        LotterySupplierEntity supplier = entity.getLotterySupplier();
        List<ReturnBatchLineModel> lines = entity.getLines() == null
                ? new ArrayList<>()
                : entity.getLines().stream()
                .filter(line -> line.getDeletedAt() == null)
                .map(this::toLineDomain)
                .collect(Collectors.toCollection(ArrayList::new));

        return ReturnBatchModel.builder()
                .id(entity.getId())
                .batchCode(entity.getBatchCode())
                .lotterySupplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .supplierCode(supplier != null ? supplier.getCode() : null)
                .drawDate(entity.getDrawDate())
                .supplierSettlementId(entity.getSupplierSettlementId())
                .returnReceiptUrl(entity.getReturnReceiptUrl())
                .deliveryMode(entity.getDeliveryMode())
                .totalQuantity(entity.getTotalQuantity())
                .totalReturnValue(entity.getTotalReturnValue())
                .returnedBy(entity.getReturnedBy())
                .returnedAt(entity.getReturnedAt())
                .confirmedAt(entity.getConfirmedAt())
                .status(entity.getStatus())
                .note(entity.getNote())
                .cancelReason(entity.getCancelReason())
                .cancelledAt(entity.getCancelledAt())
                .returnCutOffTime(supplier != null ? supplier.getReturnCutOffTime() : null)
                .lines(lines)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .deletedAt(entity.getDeletedAt())
                .build();
    }

    public ReturnBatchLineModel toLineDomain(ReturnBatchLineEntity entity) {
        if (entity == null) {
            return null;
        }
        LotteryStationEntity station = entity.getLotteryStation();
        return ReturnBatchLineModel.builder()
                .id(entity.getId())
                .returnBatchId(entity.getReturnBatch() != null ? entity.getReturnBatch().getId() : null)
                .lotteryStationId(station != null ? station.getId() : null)
                .lotteryStationName(station != null ? station.getName() : null)
                .status(entity.getStatus())
                .totalQuantity(entity.getTotalQuantity())
                .totalReturnValue(entity.getTotalReturnValue())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .deletedAt(entity.getDeletedAt())
                .build();
    }

    public ReturnBatchEntity toEntity(ReturnBatchModel model) {
        if (model == null) {
            return null;
        }
        LotterySupplierEntity supplier = null;
        if (model.getLotterySupplierId() != null) {
            supplier = new LotterySupplierEntity();
            supplier.setId(model.getLotterySupplierId());
        }
        return ReturnBatchEntity.builder()
                .id(model.getId())
                .batchCode(model.getBatchCode())
                .lotterySupplier(supplier)
                .drawDate(model.getDrawDate())
                .supplierSettlementId(model.getSupplierSettlementId())
                .returnReceiptUrl(model.getReturnReceiptUrl())
                .deliveryMode(model.getDeliveryMode())
                .totalQuantity(model.getTotalQuantity())
                .totalReturnValue(model.getTotalReturnValue())
                .returnedBy(model.getReturnedBy())
                .returnedAt(model.getReturnedAt())
                .confirmedAt(model.getConfirmedAt())
                .status(model.getStatus())
                .note(model.getNote())
                .cancelReason(model.getCancelReason())
                .cancelledAt(model.getCancelledAt())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .createdBy(model.getCreatedBy())
                .lastModifiedBy(model.getLastModifiedBy())
                .deletedAt(model.getDeletedAt())
                .build();
    }

    public ReturnBatchLineEntity toLineEntity(ReturnBatchLineModel model) {
        if (model == null) {
            return null;
        }
        ReturnBatchEntity batch = null;
        if (model.getReturnBatchId() != null) {
            batch = new ReturnBatchEntity();
            batch.setId(model.getReturnBatchId());
        }
        LotteryStationEntity station = null;
        if (model.getLotteryStationId() != null) {
            station = new LotteryStationEntity();
            station.setId(model.getLotteryStationId());
        }
        return ReturnBatchLineEntity.builder()
                .id(model.getId())
                .returnBatch(batch)
                .lotteryStation(station)
                .status(model.getStatus())
                .totalQuantity(model.getTotalQuantity())
                .totalReturnValue(model.getTotalReturnValue())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .createdBy(model.getCreatedBy())
                .lastModifiedBy(model.getLastModifiedBy())
                .deletedAt(model.getDeletedAt())
                .build();
    }

    public void updateEntityFromModel(ReturnBatchModel model, ReturnBatchEntity entity) {
        entity.setBatchCode(model.getBatchCode());
        entity.setDrawDate(model.getDrawDate());
        entity.setSupplierSettlementId(model.getSupplierSettlementId());
        entity.setReturnReceiptUrl(model.getReturnReceiptUrl());
        entity.setDeliveryMode(model.getDeliveryMode());
        entity.setTotalQuantity(model.getTotalQuantity());
        entity.setTotalReturnValue(model.getTotalReturnValue());
        entity.setReturnedBy(model.getReturnedBy());
        entity.setReturnedAt(model.getReturnedAt());
        entity.setConfirmedAt(model.getConfirmedAt());
        entity.setStatus(model.getStatus());
        entity.setNote(model.getNote());
        entity.setCancelReason(model.getCancelReason());
        entity.setCancelledAt(model.getCancelledAt());
        entity.setDeletedAt(model.getDeletedAt());
        if (model.getLotterySupplierId() != null
                && (entity.getLotterySupplier() == null
                || !model.getLotterySupplierId().equals(entity.getLotterySupplier().getId()))) {
            LotterySupplierEntity supplier = new LotterySupplierEntity();
            supplier.setId(model.getLotterySupplierId());
            entity.setLotterySupplier(supplier);
        }
    }

    public void updateLineEntityFromModel(ReturnBatchLineModel model, ReturnBatchLineEntity entity) {
        entity.setStatus(model.getStatus());
        entity.setTotalQuantity(model.getTotalQuantity());
        entity.setTotalReturnValue(model.getTotalReturnValue());
        entity.setDeletedAt(model.getDeletedAt());
        if (model.getLotteryStationId() != null
                && (entity.getLotteryStation() == null
                || !model.getLotteryStationId().equals(entity.getLotteryStation().getId()))) {
            LotteryStationEntity station = new LotteryStationEntity();
            station.setId(model.getLotteryStationId());
            entity.setLotteryStation(station);
        }
    }
}
