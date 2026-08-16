package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationAliasEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LotteryStationAliasRepository extends JpaRepository<LotteryStationAliasEntity, Long> {

    List<LotteryStationAliasEntity> findAllByDeletedAtIsNull();

    Optional<LotteryStationAliasEntity> findByAliasNormalizedAndDeletedAtIsNull(String aliasNormalized);
}
