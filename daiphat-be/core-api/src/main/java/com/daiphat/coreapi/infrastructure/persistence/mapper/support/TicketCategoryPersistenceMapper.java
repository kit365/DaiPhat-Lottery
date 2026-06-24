package com.daiphat.coreapi.infrastructure.persistence.mapper.support;

import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.TicketCategoryEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TicketCategoryPersistenceMapper {

    TicketCategoryModel toDomain(TicketCategoryEntity entity);

    List<TicketCategoryModel> toDomainList(List<TicketCategoryEntity> entities);

    TicketCategoryEntity toEntity(TicketCategoryModel domain);
}
