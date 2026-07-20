package com.daiphat.coreapi.infrastructure.persistence.mapper.support;

import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.TicketCategoryEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TicketCategoryPersistenceMapper {

    @Mapping(target = "isActive", expression = "java(entity.isActive())")
    TicketCategoryModel toDomain(TicketCategoryEntity entity);

    List<TicketCategoryModel> toDomainList(List<TicketCategoryEntity> entities);

    @Mapping(target = "isActive", expression = "java(domain.isActive())")
    TicketCategoryEntity toEntity(TicketCategoryModel domain);
}
