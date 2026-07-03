package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ImportBatchLinePersistenceMapper {

    @Mapping(target = "importBatchId", source = "importBatch.id")
    @Mapping(target = "lotteryStationId", source = "lotteryStation.id")
    ImportBatchLineModel toDomain(ImportBatchLineEntity entity);

    @Mapping(target = "importBatch", ignore = true)
    @Mapping(target = "lotteryStation", source = "lotteryStationId")
    ImportBatchLineEntity toEntity(ImportBatchLineModel model);

    default LotteryStationEntity mapLotteryStationId(Long lotteryStationId) {
        if (lotteryStationId == null) {
            return null;
        }
        LotteryStationEntity station = new LotteryStationEntity();
        station.setId(lotteryStationId);
        return station;
    }
}
