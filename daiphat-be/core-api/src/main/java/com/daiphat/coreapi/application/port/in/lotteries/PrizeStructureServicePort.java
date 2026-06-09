package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.PrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;

import java.util.List;
import java.util.UUID;

public interface PrizeStructureServicePort {
    List<PrizeStructureResponse> getByProductId(UUID productId);
    List<PrizeStructureResponse> updatePrizeStructures(UUID productId, List<PrizeStructureRequest> requests);
}
