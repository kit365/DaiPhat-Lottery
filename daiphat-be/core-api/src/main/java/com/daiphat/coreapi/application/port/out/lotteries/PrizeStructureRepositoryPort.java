package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;

import java.util.List;
import java.util.Optional;

public interface PrizeStructureRepositoryPort {
    List<PrizeStructureModel> findByProductId(Long productId);

    Optional<PrizeStructureModel> findById(Long id);

    List<PrizeStructureModel> saveAll(Long productId, List<PrizeStructureModel> models);

    void deleteByProductId(Long productId);
}
