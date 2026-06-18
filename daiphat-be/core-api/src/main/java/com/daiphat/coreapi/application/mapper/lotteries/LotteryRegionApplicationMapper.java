package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryRegionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryRegionResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import org.springframework.stereotype.Component;

@Component
public class LotteryRegionApplicationMapper {

    public LotteryRegionResponse toResponse(LotteryRegionModel model) {
        if (model == null) {
            return null;
        }
        return LotteryRegionResponse.builder()
                .id(model.getId())
                .code(model.getCode())
                .name(model.getName())
                .type(model.getType() != null ? model.getType().name() : null)
                .minNumber(model.getMinNumber())
                .maxNumber(model.getMaxNumber())
                .numberLength(model.numberLength())
                .stationCount(model.getStationCount())
                .build();
    }

    public void merge(UpdateLotteryRegionRequest request, LotteryRegionModel model) {
        model.setMinNumber(request.minNumber());
        model.setMaxNumber(request.maxNumber());
    }
}
