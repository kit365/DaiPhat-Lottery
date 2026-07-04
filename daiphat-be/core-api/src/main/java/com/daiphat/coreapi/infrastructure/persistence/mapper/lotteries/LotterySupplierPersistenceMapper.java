package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import org.springframework.stereotype.Component;

@Component
public class LotterySupplierPersistenceMapper {

    public LotterySupplierModel toDomain(LotterySupplierEntity entity) {
        if (entity == null) {
            return null;
        }
        return LotterySupplierModel.builder()
                .id(entity.getId())
                .name(entity.getName())
                .code(entity.getCode())
                .type(entity.getType())
                .contactName(entity.getContactName())
                .contactPhone(entity.getContactPhone())
                .contactEmail(entity.getContactEmail())
                .address(entity.getAddress())
                .taxCode(entity.getTaxCode())
                .paymentTermDays(entity.getPaymentTermDays())
                .defaultImportCost(entity.getDefaultImportCost())
                .isActive(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .lastModifiedBy(entity.getLastModifiedBy())
                .deletedAt(entity.getDeletedAt())
                .build();
    }

    public LotterySupplierEntity toEntity(LotterySupplierModel model) {
        if (model == null) {
            return null;
        }
        return LotterySupplierEntity.builder()
                .id(model.getId())
                .name(model.getName())
                .code(model.getCode())
                .type(model.getType())
                .contactName(model.getContactName())
                .contactPhone(model.getContactPhone())
                .contactEmail(model.getContactEmail())
                .address(model.getAddress())
                .taxCode(model.getTaxCode())
                .paymentTermDays(model.getPaymentTermDays())
                .defaultImportCost(model.getDefaultImportCost())
                .isActive(model.isActive())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .createdBy(model.getCreatedBy())
                .lastModifiedBy(model.getLastModifiedBy())
                .deletedAt(model.getDeletedAt())
                .build();
    }
}
