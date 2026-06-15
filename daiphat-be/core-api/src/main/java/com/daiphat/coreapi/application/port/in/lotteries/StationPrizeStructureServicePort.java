package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;

import java.util.List;

public interface StationPrizeStructureServicePort {

    List<PrizeStructureResponse> getByProductId(Long productId);

    PrizeStructureResponse getById(Long productId, Long id);
}
