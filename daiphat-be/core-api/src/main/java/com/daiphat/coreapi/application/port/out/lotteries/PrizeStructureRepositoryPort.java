package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;

import java.util.List;
public interface PrizeStructureRepositoryPort {
    List<PrizeStructureModel> findByProductId(Long productId);
    List<PrizeStructureModel> saveAll(Long productId, List<PrizeStructureModel> models);
    void deleteByProductId(Long productId);
}
