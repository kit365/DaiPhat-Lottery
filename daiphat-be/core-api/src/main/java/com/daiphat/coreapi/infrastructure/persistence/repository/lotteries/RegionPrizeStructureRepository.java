package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.RegionPrizeStructureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RegionPrizeStructureRepository extends JpaRepository<RegionPrizeStructureEntity, Long> {

    List<RegionPrizeStructureEntity> findByRegionIgnoreCaseAndDeletedAtIsNullOrderByDisplayOrderAsc(String region);

    Optional<RegionPrizeStructureEntity> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByRegionIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNull(String region, String prizeCode);

    boolean existsByRegionIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNullAndIdNot(
            String region, String prizeCode, Long id);

    void deleteByRegionIgnoreCase(String region);

    @Query("""
            SELECT DISTINCT t.region FROM RegionPrizeStructureEntity t
            WHERE t.deletedAt IS NULL
            ORDER BY t.region ASC
            """)
    List<String> findDistinctRegions();
}
