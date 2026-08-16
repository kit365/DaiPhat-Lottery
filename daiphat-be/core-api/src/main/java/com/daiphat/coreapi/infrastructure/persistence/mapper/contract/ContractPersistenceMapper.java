package com.daiphat.coreapi.infrastructure.persistence.mapper.contract;

import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.contract.ContractEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ContractPersistenceMapper {

    ContractModel toDomain(ContractEntity entity);

    ContractEntity toEntity(ContractModel model);
}
