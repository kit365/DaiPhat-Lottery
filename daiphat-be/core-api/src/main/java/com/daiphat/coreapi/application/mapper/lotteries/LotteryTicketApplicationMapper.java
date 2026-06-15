package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
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
    @Mapping(target = "ticketImg", ignore = true)
    @Mapping(target = "serials", ignore = true)
    LotteryTicketModel toModel(CreateLotteryTicketRequest request);

    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    @Mapping(target = "statusDisplayName", expression = "java(model.getStatus() != null ? model.getStatus().getDisplayName() : null)")
    @Mapping(target = "stationName", ignore = true)
    @Mapping(target = "serialNumber", ignore = true)
    @Mapping(target = "serials", ignore = true)
    LotteryTicketResponse toResponse(LotteryTicketModel model);

    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    @Mapping(target = "statusDisplayName", expression = "java(model.getStatus() != null ? model.getStatus().getDisplayName() : null)")
    LotteryTicketSerialResponse toSerialResponse(LotteryTicketSerialModel model);

    default LotteryTicketResponse toResponse(
            LotteryTicketModel model,
            LotteryTicketSerialModel serial,
            String stationName
    ) {
        LotteryTicketResponse base = toResponse(model);
        return new LotteryTicketResponse(
                base.id(),
                base.stationId(),
                stationName,
                serial != null ? serial.getTicketImg() : base.ticketImg(),
                serial != null ? serial.getSerialNumber() : null,
                base.numbers(),
                base.drawDate(),
                base.quantity(),
                base.priceSnapshot(),
                base.batchCode(),
                base.status(),
                base.statusDisplayName(),
                serial != null ? serial.getImportedById() : base.importedById(),
                serial != null ? serial.getImportedAt() : base.importedAt(),
                serial != null ? serial.isVerified() : base.verified(),
                serial != null ? serial.getVerifiedById() : base.verifiedById(),
                serial != null ? serial.getVerifiedAt() : base.verifiedAt(),
                serial != null ? serial.getReturnedAt() : base.returnedAt(),
                base.createdAt(),
                base.updatedAt(),
                base.createdBy(),
                base.lastModifiedBy(),
                null // serials are null in summary view
        );
    }

    default LotteryTicketResponse toResponseDetail(
            LotteryTicketModel model,
            List<LotteryTicketSerialModel> serials,
            String stationName
    ) {
        LotteryTicketResponse base = toResponse(model, serials != null && !serials.isEmpty() ? serials.get(0) : null, stationName);
        List<LotteryTicketSerialResponse> serialResponses = serials != null ?
                serials.stream().map(this::toSerialResponse).toList() : List.of();
        
        return new LotteryTicketResponse(
                base.id(),
                base.stationId(),
                base.stationName(),
                base.ticketImg(),
                base.serialNumber(),
                base.numbers(),
                base.drawDate(),
                base.quantity(),
                base.priceSnapshot(),
                base.batchCode(),
                base.status(),
                base.statusDisplayName(),
                base.importedById(),
                base.importedAt(),
                base.verified(),
                base.verifiedById(),
                base.verifiedAt(),
                base.returnedAt(),
                base.createdAt(),
                base.updatedAt(),
                base.createdBy(),
                base.lastModifiedBy(),
                serialResponses
        );
    }

    List<LotteryTicketResponse> toResponseList(List<LotteryTicketModel> models);
}
