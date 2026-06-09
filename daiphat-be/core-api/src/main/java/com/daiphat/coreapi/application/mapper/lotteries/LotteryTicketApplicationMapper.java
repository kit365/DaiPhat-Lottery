package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface LotteryTicketApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "importedById", ignore = true)
    @Mapping(target = "importedAt", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "verifiedById", ignore = true)
    @Mapping(target = "verifiedAt", ignore = true)
    @Mapping(target = "returnedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    LotteryTicketModel toModel(CreateLotteryTicketRequest request);

    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    @Mapping(target = "statusDisplayName", expression = "java(model.getStatus() != null ? model.getStatus().getDisplayName() : null)")
    @Mapping(target = "productName", ignore = true)
    LotteryTicketResponse toResponse(LotteryTicketModel model);

    List<LotteryTicketResponse> toResponseList(List<LotteryTicketModel> models);
}
