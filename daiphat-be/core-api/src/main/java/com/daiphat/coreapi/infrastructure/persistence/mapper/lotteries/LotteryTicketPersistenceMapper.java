package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring", uses = {LotteryTicketSerialPersistenceMapper.class})
public interface LotteryTicketPersistenceMapper {

    @Mapping(target = "station", source = "stationId", qualifiedByName = "stationIdToStationEntity")
    @Mapping(target = "serials", ignore = true)
    @Mapping(target = "importedBy", ignore = true)
    @Mapping(target = "verifiedBy", ignore = true)
    @Mapping(target = "importedAt", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "verifiedAt", ignore = true)
    @Mapping(target = "returnedAt", ignore = true)
    @Mapping(target = "batchCode", ignore = true)
    LotteryTicketEntity toEntity(LotteryTicketModel model);

    /**
     * Updates a managed entity from the domain model. {@code batchCode} is ignored so
     * persistence-only values are preserved across domain round-trips (domain has no batchCode).
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "station", source = "stationId", qualifiedByName = "stationIdToStationEntity")
    @Mapping(target = "serials", ignore = true)
    @Mapping(target = "importedBy", ignore = true)
    @Mapping(target = "verifiedBy", ignore = true)
    @Mapping(target = "importedAt", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "verifiedAt", ignore = true)
    @Mapping(target = "returnedAt", ignore = true)
    @Mapping(target = "batchCode", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    void updateEntityFromModel(LotteryTicketModel model, @MappingTarget LotteryTicketEntity entity);

    List<LotteryTicketEntity> toEntityList(List<LotteryTicketModel> models);

    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "importedById", ignore = true)
    @Mapping(target = "verifiedById", ignore = true)
    @Mapping(target = "importedAt", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "verifiedAt", ignore = true)
    @Mapping(target = "returnedAt", ignore = true)
    LotteryTicketModel toDomain(LotteryTicketEntity entity);

    List<LotteryTicketModel> toDomainList(List<LotteryTicketEntity> entities);

    @Named("stationIdToStationEntity")
    default LotteryStationEntity stationIdToStationEntity(Long stationId) {
        if (stationId == null) {
            return null;
        }
        LotteryStationEntity station = new LotteryStationEntity();
        station.setId(stationId);
        return station;
    }

    @Named("userIdToUserEntity")
    default UserEntity userIdToUserEntity(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }
}
