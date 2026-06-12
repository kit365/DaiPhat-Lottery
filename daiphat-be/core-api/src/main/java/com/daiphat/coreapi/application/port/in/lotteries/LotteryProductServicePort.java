package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryProductResponse;

public interface LotteryProductServicePort {

    LotteryProductResponse create(CreateLotteryProductRequest request);

    LotteryProductResponse getById(Long id);

    PageResponse<LotteryProductResponse> getAll(
            int page, int size, String search,
            String status, String type,
            String sortBy, String direction);

    LotteryProductResponse update(Long id, UpdateLotteryProductRequest request);

    void delete(Long id);
}
