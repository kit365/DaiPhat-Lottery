package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PrizeStructurePersistenceMapper {

    @Mapping(target = "productId", source = "station.id")
    @Mapping(target = "isOnly", expression = "java(entity.isOnly())")
    PrizeStructureModel toDomain(PrizeStructureEntity entity);

    List<PrizeStructureModel> toDomainList(List<PrizeStructureEntity> entities);

    @Mapping(target = "station", source = "productId", qualifiedByName = "productIdToStationEntity")
    @Mapping(target = "isOnly", expression = "java(model.isOnly())")
    PrizeStructureEntity toEntity(PrizeStructureModel model);

    List<PrizeStructureEntity> toEntityList(List<PrizeStructureModel> models);

    @Named("productIdToStationEntity")
    default LotteryStationEntity productIdToStationEntity(Long productId) {
        if (productId == null) return null;
        LotteryStationEntity station = new LotteryStationEntity();
        station.setId(productId);
        return station;
    }
}
