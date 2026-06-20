package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LotteryResultPersistenceMapper {

    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "stationName", source = "station.name")
    @Mapping(target = "regionCode", source = "station.region.code")
    @Mapping(target = "official", expression = "java(entity.isOfficial())")
    LotteryResultModel toDomain(LotteryResultEntity entity);

    List<LotteryResultModel> toDomainList(List<LotteryResultEntity> entities);

    @Mapping(target = "station", source = "stationId", qualifiedByName = "stationIdToEntity")
    @Mapping(target = "isOfficial", expression = "java(model.isOfficial())")
    @Mapping(target = "details", ignore = true)
    LotteryResultEntity toEntity(LotteryResultModel model);

    @Mapping(target = "lotteryResultId", source = "lotteryResult.id")
    @Mapping(target = "prizeStructureId", source = "prizeStructure.id")
    @Mapping(target = "prizeLevel", source = "prizeStructure.prizeLevel")
    @Mapping(target = "prizeDisplayName", source = "prizeStructure.prizeDisplayName")
    @Mapping(target = "prizeCode", source = "prizeStructure.prizeCode")
    @Mapping(target = "displayOrder", source = "prizeStructure.displayOrder")
    @Mapping(target = "matchDigits", source = "prizeStructure.matchDigits")
    @Mapping(target = "matchFrom", source = "prizeStructure.matchFrom")
    @Mapping(target = "matchFromDisplayName", source = "prizeStructure.matchFromDisplayName")
    LotteryResultDetailModel toDetailDomain(LotteryResultDetailEntity entity);

    List<LotteryResultDetailModel> toDetailDomainList(List<LotteryResultDetailEntity> entities);

    @Mapping(target = "lotteryResult", source = "lotteryResultId", qualifiedByName = "lotteryResultIdToEntity")
    @Mapping(target = "prizeStructure", source = "prizeStructureId", qualifiedByName = "prizeStructureIdToEntity")
    LotteryResultDetailEntity toDetailEntity(LotteryResultDetailModel model);

    @Named("stationIdToEntity")
    default LotteryStationEntity stationIdToEntity(Long stationId) {
        if (stationId == null) {
            return null;
        }
        LotteryStationEntity entity = new LotteryStationEntity();
        entity.setId(stationId);
        return entity;
    }

    @Named("lotteryResultIdToEntity")
    default LotteryResultEntity lotteryResultIdToEntity(Long lotteryResultId) {
        if (lotteryResultId == null) {
            return null;
        }
        LotteryResultEntity entity = new LotteryResultEntity();
        entity.setId(lotteryResultId);
        return entity;
    }

    @Named("prizeStructureIdToEntity")
    default PrizeStructureEntity prizeStructureIdToEntity(Long prizeStructureId) {
        if (prizeStructureId == null) {
            return null;
        }
        PrizeStructureEntity entity = new PrizeStructureEntity();
        entity.setId(prizeStructureId);
        return entity;
    }
}
