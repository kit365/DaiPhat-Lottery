package com.daiphat.coreapi.infrastructure.persistence.mapper;

import com.daiphat.coreapi.domain.model.PermissionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.PermissionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PermissionPersistenceMapper {

    PermissionModel toDomain(PermissionEntity entity);
}
