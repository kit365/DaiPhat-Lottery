package com.daiphat.coreapi.infrastructure.persistence.repository.lottery;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface LotteryProductRepository
        extends JpaRepository<LotteryProductEntity, UUID>,
        JpaSpecificationExecutor<LotteryProductEntity> {

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, UUID id);
}