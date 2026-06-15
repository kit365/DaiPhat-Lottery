package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.RegionPrizeStructureModel;

import java.util.List;
import java.util.Optional;

public interface RegionPrizeStructureRepositoryPort {

    List<RegionPrizeStructureModel> findByRegion(String region);

    List<String> findDistinctRegions();

    Optional<RegionPrizeStructureModel> findById(Long id);

    boolean existsByRegionAndPrizeCode(String region, String prizeCode);

    boolean existsByRegionAndPrizeCodeExcludingId(String region, String prizeCode, Long excludeId);

    RegionPrizeStructureModel save(RegionPrizeStructureModel model);

    List<RegionPrizeStructureModel> saveAll(List<RegionPrizeStructureModel> models);

    void deleteByRegion(String region);
}
