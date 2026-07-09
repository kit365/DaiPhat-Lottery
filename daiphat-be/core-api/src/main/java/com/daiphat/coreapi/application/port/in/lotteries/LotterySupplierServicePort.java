package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotterySupplierResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;

public interface LotterySupplierServicePort {

    LotterySupplierResponse create(CreateLotterySupplierRequest request);

    LotterySupplierResponse update(Long id, UpdateLotterySupplierRequest request);

    LotterySupplierResponse getById(Long id);

    LotterySupplierModel getActiveModelById(Long id);

    void ensureActiveSupplierConfigured();

    PageResponse<LotterySupplierResponse> getAll(
            int page,
            int size,
            String search,
            Boolean isActive,
            String sortBy,
            String direction
    );
}
