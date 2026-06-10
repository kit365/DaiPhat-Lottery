package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryProductResponse;

import java.util.UUID;

public interface LotteryProductServicePort {

    LotteryProductResponse create(CreateLotteryProductRequest request);

    LotteryProductResponse getById(UUID id);

    PageResponse<LotteryProductResponse> getAll(
            int page, int size, String search,
            String status, String type,
            String sortBy, String direction);

    LotteryProductResponse update(UUID id, UpdateLotteryProductRequest request);

    void delete(UUID id);
}