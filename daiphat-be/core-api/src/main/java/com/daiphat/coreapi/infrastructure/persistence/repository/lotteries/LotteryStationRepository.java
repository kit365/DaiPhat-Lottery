package com.daiphat.coreapi.infrastructure.persistence.repository.lottery;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;

public interface LotteryStationRepository
        extends JpaRepository<LotteryStationEntity, Long>,
        JpaSpecificationExecutor<LotteryStationEntity> {

    boolean existsByNameAndDeletedAtIsNull(String name);

    boolean existsByNameAndIdNotAndDeletedAtIsNull(String name, Long id);

    List<LotteryStationEntity> findByNextDrawDateAndDeletedAtIsNull(LocalDate nextDrawDate);
}
