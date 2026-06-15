package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PrizeStructureApplicationMapper {

    public PrizeStructureResponse toResponse(PrizeStructureModel model) {
        if (model == null) {
            return null;
        }

        return PrizeStructureResponse.builder()
                .id(model.getId())
                .productId(model.getProductId())
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

    public List<PrizeStructureResponse> toResponseList(List<PrizeStructureModel> models) {
        if (models == null) {
            return null;
        }
        return models.stream().map(this::toResponse).toList();
    }
}
