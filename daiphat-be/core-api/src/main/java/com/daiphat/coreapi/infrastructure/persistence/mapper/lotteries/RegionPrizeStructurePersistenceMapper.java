package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.RegionPrizeStructureModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.RegionPrizeStructureEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RegionPrizeStructurePersistenceMapper {

    @Mapping(target = "isOnly", expression = "java(entity.isOnly())")
    RegionPrizeStructureModel toDomain(RegionPrizeStructureEntity entity);

    List<RegionPrizeStructureModel> toDomainList(List<RegionPrizeStructureEntity> entities);

    @Mapping(target = "isOnly", expression = "java(model.isOnly())")
    RegionPrizeStructureEntity toEntity(RegionPrizeStructureModel model);

    List<RegionPrizeStructureEntity> toEntityList(List<RegionPrizeStructureModel> models);
}
