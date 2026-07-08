package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        uses = ImportBatchLinePersistenceMapper.class
)
public interface ImportBatchPersistenceMapper {

    @Mapping(target = "importedBy", source = "importedBy.id")
    @Mapping(target = "supplierId", source = "supplier.id")
    @Mapping(target = "supplierName", source = "supplier.name")
    @Mapping(target = "lines", ignore = true)
    ImportBatchModel toDomainHeaderOnly(ImportBatchEntity entity);

    @Mapping(target = "importedBy", source = "importedBy.id")
    @Mapping(target = "supplierId", source = "supplier.id")
    @Mapping(target = "supplierName", source = "supplier.name")
    ImportBatchModel toDomain(ImportBatchEntity entity);

    @Mapping(target = "importedBy", source = "importedBy")
    @Mapping(target = "supplier", ignore = true)
    @Mapping(target = "lines", source = "lines")
    ImportBatchEntity toEntity(ImportBatchModel model);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "batchCode")
    @Mapping(target = "drawDate")
    @Mapping(target = "supplierSettlementId")
    @Mapping(target = "importMode")
    @Mapping(target = "invoiceEvidenceUrl")
    @Mapping(target = "importedAt")
    @Mapping(target = "status")
    @Mapping(target = "lineCount")
    @Mapping(target = "totalDeclareQuantity")
    @Mapping(target = "totalDeclaredCostValue")
    @Mapping(target = "totalImportedQuantity")
    @Mapping(target = "totalImportedCostValue")
    @Mapping(target = "submittedAt")
    @Mapping(target = "completedAt")
    @Mapping(target = "ledgerAt")
    @Mapping(target = "note")
    @Mapping(target = "cancelReason")
    void updateEntityFromModel(ImportBatchModel model, @MappingTarget ImportBatchEntity entity);

    default UserEntity mapImportedBy(UUID importedBy) {
        if (importedBy == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(importedBy);
        return user;
    }
}
