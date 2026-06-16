package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface LotteryStationRepository
        extends JpaRepository<LotteryStationEntity, Long>,
        JpaSpecificationExecutor<LotteryStationEntity> {

    boolean existsByNameAndDeletedAtIsNull(String name);

    boolean existsByNameAndIdNotAndDeletedAtIsNull(String name, Long id);

    List<LotteryStationEntity> findByNextDrawDateAndDeletedAtIsNull(LocalDate nextDrawDate);

    @Modifying
    @Query("""
            update LotteryStationEntity s
            set s.nextDrawDate = :nextDrawDate
              , s.updatedAt = current_timestamp
            where s.id = :id
              and s.deletedAt is null
            """)
    int updateNextDrawDate(@Param("id") Long id, @Param("nextDrawDate") LocalDate nextDrawDate);
}
