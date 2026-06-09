package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryProductResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface LotteryProductApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "approvedById", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "type", source = "type", qualifiedByName = "stringToType")
    LotteryProductModel toModel(CreateLotteryProductRequest request);

    @Mapping(target = "type", expression = "java(model.getType() != null ? model.getType().name() : null)")
    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    LotteryProductResponse toResponse(LotteryProductModel model);

    @Named("stringToType")
    default LotteryProductType stringToType(String type) {
        if (type == null) return null;
        return LotteryProductType.valueOf(type.toUpperCase());
    }
}