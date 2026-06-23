package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryWinningCheckResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryWinningPrizeResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultResponse;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LotteryResultApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "stationName", ignore = true)
    @Mapping(target = "regionCode", ignore = true)
    @Mapping(target = "official", expression = "java(request.isOfficial() != null && request.isOfficial())")
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    LotteryResultModel toModel(CreateLotteryResultRequest request);

    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().name() : null)")
    @Mapping(target = "region", source = "regionCode")
    @Mapping(target = "isOfficial", source = "official")
    LotteryResultResponse toResponse(LotteryResultModel model);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "lotteryResultId", ignore = true)
    @Mapping(target = "prizeLevel", ignore = true)
    @Mapping(target = "prizeDisplayName", ignore = true)
    @Mapping(target = "prizeCode", ignore = true)
    @Mapping(target = "displayOrder", ignore = true)
    @Mapping(target = "matchDigits", ignore = true)
    @Mapping(target = "matchFrom", ignore = true)
    @Mapping(target = "matchFromDisplayName", ignore = true)
    LotteryResultDetailModel toDetailModel(CreateLotteryResultDetailRequest request);

    @Mapping(target = "prizeLevel", expression = "java(model.getPrizeLevel() != null ? model.getPrizeLevel().name() : null)")
    @Mapping(target = "matchFrom", expression = "java(model.getMatchFrom() != null ? model.getMatchFrom().name() : null)")
    LotteryResultDetailResponse toDetailResponse(LotteryResultDetailModel model);

    List<LotteryResultDetailResponse> toDetailResponseList(List<LotteryResultDetailModel> models);

    @Mapping(target = "prizeLevel", expression = "java(model.getPrizeLevel() != null ? model.getPrizeLevel().name() : null)")
    @Mapping(target = "matchFrom", expression = "java(model.getMatchFrom() != null ? model.getMatchFrom().name() : null)")
    @Mapping(target = "winningNumber", ignore = true)
    LotteryWinningPrizeResponse toWinningPrizeResponse(PrizeStructureModel model);

    default LotteryWinningPrizeResponse toWinningPrizeResponse(PrizeStructureModel model, String winningNumber) {
        LotteryWinningPrizeResponse response = toWinningPrizeResponse(model);
        return LotteryWinningPrizeResponse.builder()
                .prizeLevel(response.prizeLevel())
                .prizeDisplayName(response.prizeDisplayName())
                .prizeCode(response.prizeCode())
                .prizeValue(response.prizeValue())
                .matchDigits(response.matchDigits())
                .matchFrom(response.matchFrom())
                .matchFromDisplayName(response.matchFromDisplayName())
                .winningNumber(winningNumber)
                .build();
    }

    default LotteryWinningCheckResponse toWinningCheckResponse(
            LotteryResultModel result,
            LotteryStationModel station,
            java.time.LocalDate drawDate,
            String ticketNumber,
            boolean resultAvailable,
            boolean canCheck,
            boolean winning,
            java.math.BigDecimal totalWinningAmount,
            List<LotteryWinningPrizeResponse> matchedPrizes
    ) {
        return LotteryWinningCheckResponse.builder()
                .resultId(result != null ? result.getId() : null)
                .stationId(station != null ? station.getId() : null)
                .stationName(station != null ? station.getName() : null)
                .drawDate(drawDate)
                .ticketNumber(ticketNumber)
                .resultStatus(result != null && result.getStatus() != null ? result.getStatus().name() : null)
                .resultAvailable(resultAvailable)
                .canCheck(canCheck)
                .winning(winning)
                .totalWinningAmount(totalWinningAmount)
                .matchedPrizes(matchedPrizes)
                .build();
    }

    default LotteryResultModel withStation(LotteryResultModel model, LotteryStationModel station) {
        if (model == null || station == null) {
            return model;
        }
        model.setStationId(station.getId());
        model.setStationName(station.getName());
        model.setRegionCode(station.getRegion() != null ? station.getRegion().region() : null);
        return model;
    }

    default LotteryResultDetailModel withPrizeStructure(
            LotteryResultDetailModel model,
            PrizeStructureModel prizeStructure
    ) {
        if (model == null || prizeStructure == null) {
            return model;
        }
        model.setPrizeStructureId(prizeStructure.getId());
        model.setPrizeLevel(prizeStructure.getPrizeLevel());
        model.setPrizeDisplayName(prizeStructure.resolvePrizeDisplayName());
        model.setPrizeCode(prizeStructure.getPrizeCode());
        model.setDisplayOrder(prizeStructure.getDisplayOrder());
        model.setMatchDigits(prizeStructure.getMatchDigits());
        model.setMatchFrom(prizeStructure.getMatchFrom());
        model.setMatchFromDisplayName(prizeStructure.resolveMatchFromDisplayName());
        return model;
    }

    default LotteryResultModel merge(LotteryResultModel existing, UpdateLotteryResultRequest request) {
        if (existing == null) {
            return null;
        }
        return LotteryResultModel.builder()
                .id(existing.getId())
                .stationId(request.stationId() != null ? request.stationId() : existing.getStationId())
                .stationName(existing.getStationName())
                .regionCode(existing.getRegionCode())
                .drawDate(request.drawDate() != null ? request.drawDate() : existing.getDrawDate())
                .source(request.source() != null ? request.source() : existing.getSource())
                .official(request.isOfficial() != null ? request.isOfficial() : existing.isOfficial())
                .status(request.status() != null ? stringToStatus(request.status()) : existing.getStatus())
                .publishedAt(request.publishedAt() != null ? request.publishedAt() : existing.getPublishedAt())
                .lastSyncedAt(existing.getLastSyncedAt())
                .requestedAt(existing.getRequestedAt())
                .deletedAt(existing.getDeletedAt())
                .createdAt(existing.getCreatedAt())
                .updatedAt(existing.getUpdatedAt())
                .createdBy(existing.getCreatedBy())
                .lastModifiedBy(existing.getLastModifiedBy())
                .build();
    }

    default LotteryResultDetailModel mergeDetail(
            LotteryResultDetailModel existing,
            UpdateLotteryResultDetailRequest request
    ) {
        if (existing == null) {
            return null;
        }
        return LotteryResultDetailModel.builder()
                .id(existing.getId())
                .lotteryResultId(existing.getLotteryResultId())
                .prizeStructureId(request.prizeStructureId() != null ? request.prizeStructureId() : existing.getPrizeStructureId())
                .prizeLevel(existing.getPrizeLevel())
                .prizeDisplayName(existing.getPrizeDisplayName())
                .prizeCode(existing.getPrizeCode())
                .displayOrder(existing.getDisplayOrder())
                .matchDigits(existing.getMatchDigits())
                .matchFrom(existing.getMatchFrom())
                .matchFromDisplayName(existing.getMatchFromDisplayName())
                .winningNumber(request.winningNumber() != null ? request.winningNumber().trim() : existing.getWinningNumber())
                .deletedAt(existing.getDeletedAt())
                .createdAt(existing.getCreatedAt())
                .updatedAt(existing.getUpdatedAt())
                .createdBy(existing.getCreatedBy())
                .lastModifiedBy(existing.getLastModifiedBy())
                .build();
    }

    @Named("stringToStatus")
    default LotteryResultStatus stringToStatus(String value) {
        if (value == null || value.isBlank()) {
            return LotteryResultStatus.PENDING;
        }
        try {
            return LotteryResultStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_STATUS_INVALID);
        }
    }
}
