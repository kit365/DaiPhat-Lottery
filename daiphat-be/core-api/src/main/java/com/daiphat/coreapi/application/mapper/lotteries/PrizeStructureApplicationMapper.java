package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.PrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PrizeStructureApplicationMapper {

    public PrizeStructureModel toModel(PrizeStructureRequest request) {
        if (request == null) {
            return null;
        }

        return PrizeStructureModel.builder()
                .region(request.region())
                .isOnly(booleanOrDefault(request.isOnly()))
                .prizeLevel(stringToPrizeLevel(request.prizeLevel()))
                .prizeDisplayName(request.prizeDisplayName())
                .prizeCode(request.prizeCode())
                .prizeValue(request.prizeValue())
                .quantity(request.quantity())
                .matchDigits(request.matchDigits())
                .matchFrom(stringToMatchFrom(request.matchFrom()))
                .matchFromDisplayName(request.matchFromDisplayName())
                .displayOrder(request.displayOrder())
                .build();
    }

    public List<PrizeStructureModel> toModelList(List<PrizeStructureRequest> requests) {
        if (requests == null) {
            return null;
        }
        return requests.stream().map(this::toModel).toList();
    }

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

    private PrizeLevel stringToPrizeLevel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return PrizeLevel.valueOf(value.toUpperCase());
    }

    private MatchFrom stringToMatchFrom(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return MatchFrom.valueOf(value.toUpperCase());
    }

    private boolean booleanOrDefault(Boolean value) {
        return Boolean.TRUE.equals(value);
    }
}
