package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface LotteryRegionPersistenceMapper {

    LotteryRegionModel toDomain(LotteryRegionEntity entity);

    LotteryRegionEntity toEntity(LotteryRegionModel model);
}
