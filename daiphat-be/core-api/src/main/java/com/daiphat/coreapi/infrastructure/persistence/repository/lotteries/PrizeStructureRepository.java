package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PrizeStructureRepository extends JpaRepository<PrizeStructureEntity, Long> {
    List<PrizeStructureEntity> findByRegion_CodeIgnoreCaseAndDeletedAtIsNullOrderByDisplayOrderAsc(String regionCode);

    Optional<PrizeStructureEntity> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByRegion_CodeIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNull(String regionCode, String prizeCode);

    boolean existsByRegion_CodeIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNullAndIdNot(
            String regionCode, String prizeCode, Long excludeId);

    void deleteByRegion_CodeIgnoreCase(String regionCode);

    @Query("""
            SELECT DISTINCT p.region.code FROM PrizeStructureEntity p
            WHERE p.deletedAt IS NULL
            ORDER BY p.region.code ASC
            """)
    List<String> findDistinctRegionCodes();
}
