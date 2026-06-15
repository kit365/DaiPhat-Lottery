package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring")
public interface LotteryTicketPersistenceMapper {

    @Mapping(target = "station", source = "stationId", qualifiedByName = "stationIdToStationEntity")
    @Mapping(target = "importedBy", source = "importedById", qualifiedByName = "userIdToUserEntity")
    @Mapping(target = "verifiedBy", source = "verifiedById", qualifiedByName = "userIdToUserEntity")
    @Mapping(target = "serials", ignore = true)
    LotteryTicketEntity toEntity(LotteryTicketModel model);

    List<LotteryTicketEntity> toEntityList(List<LotteryTicketModel> models);

    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "importedById", source = "importedBy.id")
    @Mapping(target = "verifiedById", source = "verifiedBy.id")
    @Mapping(target = "serials", ignore = true)
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
