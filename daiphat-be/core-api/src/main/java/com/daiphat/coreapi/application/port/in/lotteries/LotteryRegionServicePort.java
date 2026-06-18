package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryRegionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryRegionResponse;

import java.util.List;

public interface LotteryRegionServicePort {

    List<LotteryRegionResponse> getAll();

    LotteryRegionResponse getByCode(String code);

    LotteryRegionResponse update(String code, UpdateLotteryRegionRequest request);
}
