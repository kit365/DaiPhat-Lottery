package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PrizeStructurePersistenceMapper {

    @Mapping(target = "regionId", source = "region.id")
    @Mapping(target = "regionCode", source = "region.code")
    @Mapping(target = "isActive", expression = "java(entity.isActive())")
    PrizeStructureModel toDomain(PrizeStructureEntity entity);

    List<PrizeStructureModel> toDomainList(List<PrizeStructureEntity> entities);

    @Mapping(target = "region", source = "regionId", qualifiedByName = "regionIdToEntity")
    @Mapping(target = "isActive", expression = "java(model.isActive())")
    PrizeStructureEntity toEntity(PrizeStructureModel model);

    List<PrizeStructureEntity> toEntityList(List<PrizeStructureModel> models);

    @Named("regionIdToEntity")
    default LotteryRegionEntity regionIdToEntity(Long regionId) {
        if (regionId == null) return null;
        LotteryRegionEntity region = new LotteryRegionEntity();
        region.setId(regionId);
        return region;
    }
}
