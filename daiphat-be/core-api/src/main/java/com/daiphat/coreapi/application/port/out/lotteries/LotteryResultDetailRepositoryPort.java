package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;

import java.util.List;
import java.util.Optional;

public interface LotteryResultDetailRepositoryPort {

    LotteryResultDetailModel save(LotteryResultDetailModel model);

    Optional<LotteryResultDetailModel> findById(Long id);

    List<LotteryResultDetailModel> findByLotteryResultId(Long lotteryResultId);

    boolean existsByLotteryResultIdAndPrizeStructureIdAndWinningNumber(
            Long lotteryResultId,
            Long prizeStructureId,
            String winningNumber
    );

    boolean existsByLotteryResultIdAndPrizeStructureIdAndWinningNumberExcludingId(
            Long lotteryResultId,
            Long prizeStructureId,
            String winningNumber,
            Long excludeId
    );

    void deleteById(Long id);
}
