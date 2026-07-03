package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        uses = ImportBatchLinePersistenceMapper.class
)
public interface ImportBatchPersistenceMapper {

    @Mapping(target = "importedBy", source = "importedBy.id")
    ImportBatchModel toDomain(ImportBatchEntity entity);

    @Mapping(target = "importedBy", source = "importedBy")
    @Mapping(target = "lines", source = "lines")
    ImportBatchEntity toEntity(ImportBatchModel model);

    default UserEntity mapImportedBy(UUID importedBy) {
        if (importedBy == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(importedBy);
        return user;
    }
}
