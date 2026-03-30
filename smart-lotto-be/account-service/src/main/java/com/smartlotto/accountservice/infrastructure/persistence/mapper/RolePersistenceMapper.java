package com.smartlotto.accountservice.infrastructure.persistence.mapper;

import com.smartlotto.accountservice.domain.model.RoleModel;
import com.smartlotto.accountservice.infrastructure.persistence.entity.RoleEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RolePersistenceMapper {

    RoleModel toDomain(RoleEntity entity);

    RoleEntity toEntity(RoleModel domain);
}
