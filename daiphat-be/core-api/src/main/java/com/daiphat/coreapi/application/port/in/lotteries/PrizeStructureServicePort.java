package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.PrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;

import java.util.List;
public interface PrizeStructureServicePort {
    List<PrizeStructureResponse> getByProductId(Long productId);
    List<PrizeStructureResponse> updatePrizeStructures(Long productId, List<PrizeStructureRequest> requests);
}
