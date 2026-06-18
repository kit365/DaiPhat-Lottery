package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;

import java.util.List;
import java.util.Optional;

public interface PrizeStructureRepositoryPort {
    List<PrizeStructureModel> findByRegionCode(String regionCode);

    List<String> findDistinctRegionCodes();

    Optional<PrizeStructureModel> findById(Long id);

    boolean existsByRegionCodeAndPrizeCode(String regionCode, String prizeCode);

    boolean existsByRegionCodeAndPrizeCodeExcludingId(String regionCode, String prizeCode, Long excludeId);

    PrizeStructureModel save(PrizeStructureModel model);

    List<PrizeStructureModel> saveAll(List<PrizeStructureModel> models);

    void deleteById(Long id);

    void deleteByRegionCode(String regionCode);
}
