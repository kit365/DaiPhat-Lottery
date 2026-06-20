package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSchedulePublicResponse;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.mapstruct.Mapper;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.time.DayOfWeek;
import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface LotteryStationApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    @Mapping(target = "approvedById", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "region", ignore = true)
    LotteryStationModel toModel(CreateLotteryStationRequest request);

    @Mapping(target = "region", source = "region", qualifiedByName = "regionToString")
    @Mapping(target = "type", expression = "java(model.getRegion() != null && model.getRegion().getType() != null ? model.getRegion().getType().name() : null)")
    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    LotteryStationResponse toResponse(LotteryStationModel model);

    @Mapping(target = "stationId", source = "id")
    @Mapping(target = "stationName", source = "name")
    @Mapping(target = "region", source = "region", qualifiedByName = "regionToString")
    @Mapping(target = "drawDays", source = "drawDays", qualifiedByName = "drawDaysToCodes")
    @Mapping(target = "drawDaysDisplay", source = "drawDays", qualifiedByName = "drawDaysToDisplayNames")
    LotteryStationSchedulePublicResponse toSchedulePublicResponse(LotteryStationModel model);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "approvedById", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "name", ignore = true)
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    @Mapping(target = "region", ignore = true)
    void updateModel(@MappingTarget LotteryStationModel model, UpdateLotteryStationRequest request);

    @Named("stringToStatus")
    default LotteryStationStatus stringToStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return LotteryStationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_STATUS);
        }
    }

    @Named("regionToString")
    default String regionToString(LotteryRegionModel region) {
        return region != null ? region.region() : null;
    }

    @Named("drawDaysToCodes")
    default List<String> drawDaysToCodes(List<DayOfWeek> drawDays) {
        if (drawDays == null) {
            return List.of();
        }
        return drawDays.stream()
                .map(DayOfWeek::name)
                .toList();
    }

    @Named("drawDaysToDisplayNames")
    default List<String> drawDaysToDisplayNames(List<DayOfWeek> drawDays) {
        if (drawDays == null) {
            return List.of();
        }
        return drawDays.stream()
                .map(this::toVietnameseDayLabel)
                .toList();
    }

    default String toVietnameseDayLabel(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "Thứ 2";
            case TUESDAY -> "Thứ 3";
            case WEDNESDAY -> "Thứ 4";
            case THURSDAY -> "Thứ 5";
            case FRIDAY -> "Thứ 6";
            case SATURDAY -> "Thứ 7";
            case SUNDAY -> "Chủ nhật";
        };
    }
}
