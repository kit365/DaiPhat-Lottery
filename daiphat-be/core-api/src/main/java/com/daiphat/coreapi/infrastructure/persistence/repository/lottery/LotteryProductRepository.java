package com.daiphat.coreapi.infrastructure.persistence.repository.lottery;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LotteryProductRepository
        extends JpaRepository<LotteryStationEntity, Long>,
        JpaSpecificationExecutor<LotteryStationEntity> {

    boolean existsByNameAndDeletedAtIsNull(String name);

    boolean existsByNameAndIdNotAndDeletedAtIsNull(String name, Long id);
}
