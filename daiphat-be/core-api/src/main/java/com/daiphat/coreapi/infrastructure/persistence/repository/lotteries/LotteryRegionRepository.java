package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LotteryRegionRepository extends JpaRepository<LotteryRegionEntity, Long> {

    Optional<LotteryRegionEntity> findByCodeIgnoreCase(String code);
}
