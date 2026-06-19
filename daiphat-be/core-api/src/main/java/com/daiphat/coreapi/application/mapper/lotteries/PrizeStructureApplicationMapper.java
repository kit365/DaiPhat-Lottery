package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourceItem;
import com.daiphat.coreapi.application.dto.lotteries.PrizeStructureSourcePreviewResult;
import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PrizeStructureApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "regionId", source = "regionId")
    @Mapping(target = "regionCode", source = "regionCode")
    @Mapping(target = "prizeLevel", source = "request.prizeLevel", qualifiedByName = "stringToPrizeLevel")
    @Mapping(target = "prizeCode", source = "request.prizeCode", qualifiedByName = "normalizeCode")
    @Mapping(target = "prizeValue", expression = "java(defaultPrizeValue(request.prizeValue()))")
    @Mapping(target = "matchFrom", source = "request.matchFrom", qualifiedByName = "stringToMatchFrom")
    @Mapping(target = "displayOrder", expression = "java(request.displayOrder() != null ? request.displayOrder() : 0)")
    @Mapping(target = "isActive", expression = "java(request.isActive() == null || request.isActive())")
    PrizeStructureModel toModel(RegionPrizeStructureRequest request, Long regionId, String regionCode);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "regionId", expression = "java(region != null ? region.getId() : null)")
    @Mapping(target = "regionCode", expression = "java(region != null ? region.region() : null)")
    @Mapping(target = "prizeLevel", source = "item.prizeLevel", qualifiedByName = "stringToPrizeLevel")
    @Mapping(target = "prizeCode", source = "item.prizeCode", qualifiedByName = "normalizeCode")
    @Mapping(target = "prizeValue", expression = "java(defaultPrizeValue(item.prizeValue()))")
    @Mapping(target = "matchFrom", source = "item.matchFrom", qualifiedByName = "stringToMatchFrom")
    @Mapping(target = "displayOrder", expression = "java(item.displayOrder() != null ? item.displayOrder() : 0)")
    @Mapping(target = "isActive", expression = "java(item.isActive() == null || item.isActive())")
    PrizeStructureModel toModel(PrizeStructureSourceItem item, LotteryRegionModel region);

    @Mapping(target = "prizeLevel", expression = "java(model.getPrizeLevel() != null ? model.getPrizeLevel().name() : null)")
    @Mapping(target = "prizeDisplayName", expression = "java(model.resolvePrizeDisplayName())")
    @Mapping(target = "matchFrom", expression = "java(model.getMatchFrom() != null ? model.getMatchFrom().name() : null)")
    @Mapping(target = "matchFromDisplayName", expression = "java(model.resolveMatchFromDisplayName())")
    PrizeStructureResponse toResponse(PrizeStructureModel model);

    List<PrizeStructureResponse> toResponseList(List<PrizeStructureModel> models);

    default PrizeStructureModel merge(RegionPrizeStructureRequest request, PrizeStructureModel existing) {
        if (existing == null) {
            return null;
        }

        PrizeStructureModel requestModel = toModel(request, existing.getRegionId(), existing.getRegionCode());

        return PrizeStructureModel.builder()
                .id(existing.getId())
                .regionId(existing.getRegionId())
                .regionCode(existing.getRegionCode())
                .prizeLevel(requestModel.getPrizeLevel() != null ? requestModel.getPrizeLevel() : existing.getPrizeLevel())
                .prizeDisplayName(request.prizeDisplayName() != null
                        ? request.prizeDisplayName()
                        : existing.getPrizeDisplayName())
                .prizeCode(hasText(request.prizeCode()) ? normalizeCode(request.prizeCode()) : existing.getPrizeCode())
                .description(request.description() != null ? request.description() : existing.getDescription())
                .prizeValue(request.prizeValue() != null ? request.prizeValue() : existing.getPrizeValue())
                .quantity(request.quantity() != null ? request.quantity() : existing.getQuantity())
                .matchDigits(request.matchDigits() != null ? request.matchDigits() : existing.getMatchDigits())
                .matchFrom(requestModel.getMatchFrom() != null ? requestModel.getMatchFrom() : existing.getMatchFrom())
                .matchFromDisplayName(request.matchFromDisplayName() != null
                        ? request.matchFromDisplayName()
                        : existing.getMatchFromDisplayName())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : existing.getDisplayOrder())
                .isActive(request.isActive() != null ? request.isActive() : existing.isActive())
                .createdAt(existing.getCreatedAt())
                .updatedAt(existing.getUpdatedAt())
                .deletedAt(existing.getDeletedAt())
                .build();
    }

    default PrizeStructureSyncItemResponse toSyncItemResponse(
            Long prizeStructureId,
            PrizeStructureModel model,
            SyncAction action,
            String note
    ) {
        return PrizeStructureSyncItemResponse.builder()
                .prizeStructureId(prizeStructureId)
                .prizeLevel(model.getPrizeLevel() != null ? model.getPrizeLevel().name() : null)
                .prizeDisplayName(model.resolvePrizeDisplayName())
                .prizeCode(model.getPrizeCode())
                .description(model.getDescription())
                .prizeValue(model.getPrizeValue())
                .quantity(model.getQuantity())
                .matchDigits(model.getMatchDigits())
                .matchFrom(model.getMatchFrom() != null ? model.getMatchFrom().name() : null)
                .matchFromDisplayName(model.resolveMatchFromDisplayName())
                .displayOrder(model.getDisplayOrder())
                .isActive(model.isActive())
                .action(action)
                .note(note)
                .build();
    }

    default PrizeStructureSyncItemResponse finalizeSyncItemResponse(
            PrizeStructureSyncItemResponse item,
            PrizeStructureModel savedModel
    ) {
        return PrizeStructureSyncItemResponse.builder()
                .prizeStructureId(savedModel != null ? savedModel.getId() : item.prizeStructureId())
                .prizeLevel(item.prizeLevel())
                .prizeDisplayName(item.prizeDisplayName())
                .prizeCode(item.prizeCode())
                .description(item.description())
                .prizeValue(item.prizeValue())
                .quantity(item.quantity())
                .matchDigits(item.matchDigits())
                .matchFrom(item.matchFrom())
                .matchFromDisplayName(item.matchFromDisplayName())
                .displayOrder(item.displayOrder())
                .isActive(item.isActive())
                .action(item.action())
                .note(item.note())
                .build();
    }

    default PrizeStructureSyncResponse toSyncResponse(
            PrizeStructureSourcePreviewResult preview,
            LotteryRegionModel resolvedRegion,
            int createdCount,
            int updatedCount,
            int deletedCount,
            int skippedCount,
            List<PrizeStructureSyncItemResponse> items
    ) {
        return PrizeStructureSyncResponse.builder()
                .source(preview.source())
                .region(resolvedRegion.region())
                .requestUrl(preview.requestUrl())
                .fetchedAt(preview.fetchedAt())
                .totalFetched(preview.totalItems())
                .createdCount(createdCount)
                .updatedCount(updatedCount)
                .deletedCount(deletedCount)
                .skippedCount(skippedCount)
                .warnings(preview.warnings())
                .items(items)
                .build();
    }

    @Named("stringToPrizeLevel")
    default PrizeLevel stringToPrizeLevel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return PrizeLevel.valueOf(value.trim().toUpperCase());
    }

    @Named("stringToMatchFrom")
    default MatchFrom stringToMatchFrom(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return MatchFrom.valueOf(value.trim().toUpperCase());
    }

    @Named("normalizeCode")
    default String normalizeCode(String code) {
        return code != null ? code.trim().toUpperCase() : null;
    }

    default boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    default BigDecimal defaultPrizeValue(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
