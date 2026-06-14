package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.BeanMapping;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface LotteryStationApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "approvedById", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "type", source = "type", qualifiedByName = "stringToType")
    LotteryStationModel toModel(CreateLotteryStationRequest request);

    @Mapping(target = "type", expression = "java(model.getType() != null ? model.getType().name() : null)")
    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    LotteryStationResponse toResponse(LotteryStationModel model);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "approvedById", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "name", ignore = true)
    @Mapping(target = "type", source = "type", qualifiedByName = "stringToType")
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    void updateModel(@MappingTarget LotteryStationModel model, UpdateLotteryStationRequest request);

    @Named("stringToType")
    default LotteryStationType stringToType(String type) {
        if (type == null || type.isBlank()) return null;
        try {
            return LotteryStationType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_TYPE);
        }
    }

    @Named("stringToStatus")
    default LotteryStationStatus stringToStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return LotteryStationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_STATUS);
        }
    }
}