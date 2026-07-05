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
    @Mapping(target = "batchCode", ignore = true)
    LotteryTicketResponse toResponse(LotteryTicketModel model);

    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    @Mapping(target = "statusDisplayName", expression = "java(model.getStatus() != null ? model.getStatus().getDisplayName() : null)")
    @Mapping(target = "inputSource", expression = "java(model.getInputSource() != null ? model.getInputSource().name() : null)")
    @Mapping(target = "importBatchId", source = "importBatchId")
    @Mapping(target = "importBatchLineId", source = "importBatchLineId")
    @Mapping(target = "batchCode", ignore = true)
    LotteryTicketSerialResponse toSerialResponse(LotteryTicketSerialModel model);

    default LotteryTicketSerialResponse toSerialResponse(LotteryTicketSerialModel model, String batchCode) {
        LotteryTicketSerialResponse base = toSerialResponse(model);
        return new LotteryTicketSerialResponse(
                base.id(),
                base.ticketId(),
                model.getImportBatchId(),
                model.getImportBatchLineId(),
                batchCode,
                base.ticketImg(),
                base.serialNumber(),
                base.status(),
                base.statusDisplayName(),
                base.inputSource(),
                base.reservedAt(),
                base.reservationExpiresAt(),
                base.reservedByOrderId(),
                base.importedById(),
                base.importedAt(),
                base.verified(),
                base.verifiedById(),
                base.verifiedAt(),
                base.returnedAt(),
                base.damagedEvidenceUrl(),
                base.damagedReason(),
                base.createdAt(),
                base.updatedAt(),
                base.createdBy(),
                base.lastModifiedBy()
        );
    }

    default LotteryTicketResponse toResponse(
            LotteryTicketModel model,
            LotteryTicketSerialModel serial,
            String stationName,
            String batchCode
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
                batchCode,
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
            List<LotteryTicketSerialResponse> serialResponses,
            String stationName,
            String batchCode
    ) {
        LotteryTicketSerialResponse firstSerial = serialResponses != null && !serialResponses.isEmpty()
                ? serialResponses.getFirst()
                : null;
        LotteryTicketResponse base = toResponse(
                model,
                firstSerial != null ? toSerialModel(firstSerial) : null,
                stationName,
                batchCode
        );

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
                batchCode,
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

    default LotteryTicketSerialModel toSerialModel(LotteryTicketSerialResponse response) {
        if (response == null) {
            return null;
        }
        return LotteryTicketSerialModel.builder()
                .id(response.id())
                .ticketId(response.ticketId())
                .importBatchId(response.importBatchId())
                .importBatchLineId(response.importBatchLineId())
                .ticketImg(response.ticketImg())
                .serialNumber(response.serialNumber())
                .importedById(response.importedById())
                .importedAt(response.importedAt())
                .verified(response.verified())
                .verifiedById(response.verifiedById())
                .verifiedAt(response.verifiedAt())
                .returnedAt(response.returnedAt())
                .build();
    }

    List<LotteryTicketResponse> toResponseList(List<LotteryTicketModel> models);
}
