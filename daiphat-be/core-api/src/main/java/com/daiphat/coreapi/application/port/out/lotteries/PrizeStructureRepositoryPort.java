package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;

import java.util.List;
import java.util.UUID;

public interface PrizeStructureRepositoryPort {
    List<PrizeStructureModel> findByProductId(UUID productId);
    List<PrizeStructureModel> saveAll(UUID productId, List<PrizeStructureModel> models);
    void deleteByProductId(UUID productId);
}
