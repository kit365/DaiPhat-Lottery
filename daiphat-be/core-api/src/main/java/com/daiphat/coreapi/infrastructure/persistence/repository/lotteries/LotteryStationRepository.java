package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LotteryStationRepository
        extends JpaRepository<LotteryStationEntity, Long>,
        JpaSpecificationExecutor<LotteryStationEntity> {

    @Override
    @EntityGraph(attributePaths = "region")
    List<LotteryStationEntity> findAll();

    @Override
    @EntityGraph(attributePaths = "region")
    Page<LotteryStationEntity> findAll(Specification<LotteryStationEntity> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "region")
    Optional<LotteryStationEntity> findById(Long id);

    boolean existsByNameAndDeletedAtIsNull(String name);

    boolean existsByNameAndIdNotAndDeletedAtIsNull(String name, Long id);

    @EntityGraph(attributePaths = "region")
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
