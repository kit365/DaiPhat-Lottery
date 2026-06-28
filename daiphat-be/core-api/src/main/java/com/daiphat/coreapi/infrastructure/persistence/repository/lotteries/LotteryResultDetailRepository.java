package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LotteryResultDetailRepository extends JpaRepository<LotteryResultDetailEntity, Long> {

    Optional<LotteryResultDetailEntity> findByIdAndDeletedAtIsNull(Long id);

    List<LotteryResultDetailEntity> findByLotteryResult_IdAndDeletedAtIsNullOrderByPrizeStructure_DisplayOrderAscWinningNumberAsc(
            Long lotteryResultId
    );

    boolean existsByLotteryResult_IdAndPrizeStructure_IdAndWinningNumberAndDeletedAtIsNull(
            Long lotteryResultId,
            Long prizeStructureId,
            String winningNumber
    );

    boolean existsByLotteryResult_IdAndPrizeStructure_IdAndWinningNumberAndDeletedAtIsNullAndIdNot(
            Long lotteryResultId,
            Long prizeStructureId,
            String winningNumber,
            Long id
    );
}
