package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PrizeStructureRepository extends JpaRepository<PrizeStructureEntity, UUID> {
    List<PrizeStructureEntity> findByProductIdOrderByDisplayOrderAsc(UUID productId);
    void deleteByProductId(UUID productId);
}
