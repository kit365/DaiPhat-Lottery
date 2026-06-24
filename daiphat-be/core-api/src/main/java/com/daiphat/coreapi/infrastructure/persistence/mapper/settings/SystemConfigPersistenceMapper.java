package com.daiphat.coreapi.infrastructure.persistence.mapper.settings;

import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.settings.SystemConfigEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface SystemConfigPersistenceMapper {

    SystemConfigModel toDomain(SystemConfigEntity entity);

    SystemConfigEntity toEntity(SystemConfigModel model);
}
