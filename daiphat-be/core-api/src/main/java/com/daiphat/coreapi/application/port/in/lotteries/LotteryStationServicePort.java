package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;

public interface LotteryStationServicePort {

    LotteryStationResponse create(CreateLotteryStationRequest request);

    LotteryStationResponse getById(Long id);

    PageResponse<LotteryStationResponse> getAll(
            int page, int size, String search,
            String status, String type,
            String sortBy, String direction);

    LotteryStationResponse update(Long id, UpdateLotteryStationRequest request);

    void delete(Long id);
}
