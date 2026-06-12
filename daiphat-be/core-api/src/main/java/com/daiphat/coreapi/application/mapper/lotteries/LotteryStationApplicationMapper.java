package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
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

    @Named("stringToType")
    default LotteryStationType stringToType(String type) {
        if (type == null) return null;
        return LotteryStationType.valueOf(type.toUpperCase());
    }
}