package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.RegionPrizeStructureResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.lotteries.RegionPrizeStructureModel;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class RegionPrizeStructureApplicationMapper {

    public RegionPrizeStructureModel toModel(RegionPrizeStructureRequest request, String region) {
        if (request == null) {
            return null;
        }

        return RegionPrizeStructureModel.builder()
                .region(region)
                .isOnly(booleanOrDefault(request.isOnly()))
                .prizeLevel(stringToPrizeLevel(request.prizeLevel()))
                .prizeDisplayName(request.prizeDisplayName())
                .prizeCode(normalizeCode(request.prizeCode()))
                .prizeValue(request.prizeValue() != null ? request.prizeValue() : BigDecimal.ZERO)
                .quantity(request.quantity())
                .matchDigits(request.matchDigits())
                .matchFrom(stringToMatchFrom(request.matchFrom()))
                .matchFromDisplayName(request.matchFromDisplayName())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
                .build();
    }

    public RegionPrizeStructureModel merge(
            RegionPrizeStructureRequest request,
            RegionPrizeStructureModel existing) {
        if (existing == null) {
            return toModel(request, request != null ? null : null);
        }

        RegionPrizeStructureModel requestModel = toModel(request, existing.getRegion());

        return RegionPrizeStructureModel.builder()
                .id(existing.getId())
                .region(existing.getRegion())
                .isOnly(request.isOnly() != null ? request.isOnly() : existing.isOnly())
                .prizeLevel(requestModel.getPrizeLevel() != null ? requestModel.getPrizeLevel() : existing.getPrizeLevel())
                .prizeDisplayName(request.prizeDisplayName() != null
                        ? request.prizeDisplayName()
                        : existing.getPrizeDisplayName())
                .prizeCode(hasText(request.prizeCode()) ? normalizeCode(request.prizeCode()) : existing.getPrizeCode())
                .prizeValue(request.prizeValue() != null ? request.prizeValue() : existing.getPrizeValue())
                .quantity(request.quantity() != null ? request.quantity() : existing.getQuantity())
                .matchDigits(request.matchDigits() != null ? request.matchDigits() : existing.getMatchDigits())
                .matchFrom(requestModel.getMatchFrom() != null ? requestModel.getMatchFrom() : existing.getMatchFrom())
                .matchFromDisplayName(request.matchFromDisplayName() != null
                        ? request.matchFromDisplayName()
                        : existing.getMatchFromDisplayName())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : existing.getDisplayOrder())
                .createdAt(existing.getCreatedAt())
                .updatedAt(existing.getUpdatedAt())
                .deletedAt(existing.getDeletedAt())
                .build();
    }

    public RegionPrizeStructureResponse toResponse(RegionPrizeStructureModel model) {
        if (model == null) {
            return null;
        }

        return RegionPrizeStructureResponse.builder()
                .id(model.getId())
                .region(model.getRegion())
                .isOnly(model.isOnly())
                .prizeLevel(model.getPrizeLevel() != null ? model.getPrizeLevel().name() : null)
                .prizeDisplayName(model.resolvePrizeDisplayName())
                .prizeCode(model.getPrizeCode())
                .prizeValue(model.getPrizeValue())
                .quantity(model.getQuantity())
                .matchDigits(model.getMatchDigits())
                .matchFrom(model.getMatchFrom() != null ? model.getMatchFrom().name() : null)
                .matchFromDisplayName(model.resolveMatchFromDisplayName())
                .displayOrder(model.getDisplayOrder())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    public List<RegionPrizeStructureResponse> toResponseList(List<RegionPrizeStructureModel> models) {
        if (models == null) {
            return List.of();
        }
        return models.stream().map(this::toResponse).toList();
    }

    private PrizeLevel stringToPrizeLevel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return PrizeLevel.valueOf(value.trim().toUpperCase());
    }

    private MatchFrom stringToMatchFrom(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return MatchFrom.valueOf(value.trim().toUpperCase());
    }

    private boolean booleanOrDefault(Boolean value) {
        return Boolean.TRUE.equals(value);
    }

    private String normalizeCode(String code) {
        return code != null ? code.trim().toUpperCase() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
