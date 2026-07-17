package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.result.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryResultPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryResultDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryResultRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeStructureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LotteryResultDetailRepositoryAdapter implements LotteryResultDetailRepositoryPort {

    private final LotteryResultDetailRepository lotteryResultDetailRepository;
    private final LotteryResultRepository lotteryResultRepository;
    private final PrizeStructureRepository prizeStructureRepository;
    private final LotteryResultPersistenceMapper lotteryResultPersistenceMapper;

    @Override
    public LotteryResultDetailModel save(LotteryResultDetailModel model) {
        LotteryResultDetailEntity entity = lotteryResultPersistenceMapper.toDetailEntity(model);
        if (model.getLotteryResultId() != null) {
            entity.setLotteryResult(lotteryResultRepository.getReferenceById(model.getLotteryResultId()));
        }
        if (model.getPrizeStructureId() != null) {
            entity.setPrizeStructure(prizeStructureRepository.getReferenceById(model.getPrizeStructureId()));
        }
        return lotteryResultPersistenceMapper.toDetailDomain(lotteryResultDetailRepository.save(entity));
    }

    @Override
    public Optional<LotteryResultDetailModel> findById(Long id) {
        return lotteryResultDetailRepository.findByIdAndDeletedAtIsNull(id)
                .map(lotteryResultPersistenceMapper::toDetailDomain);
    }

    @Override
    public List<LotteryResultDetailModel> findByLotteryResultId(Long lotteryResultId) {
        return lotteryResultPersistenceMapper.toDetailDomainList(
                lotteryResultDetailRepository
                        .findByLotteryResult_IdAndDeletedAtIsNullOrderByPrizeStructure_DisplayOrderAscWinningNumberAsc(
                                lotteryResultId
                        )
        );
    }

    @Override
    public boolean existsByLotteryResultIdAndPrizeStructureIdAndWinningNumber(
            Long lotteryResultId,
            Long prizeStructureId,
            String winningNumber
    ) {
        return lotteryResultDetailRepository
                .existsByLotteryResult_IdAndPrizeStructure_IdAndWinningNumberAndDeletedAtIsNull(
                        lotteryResultId,
                        prizeStructureId,
                        winningNumber
                );
    }

    @Override
    public boolean existsByLotteryResultIdAndPrizeStructureIdAndWinningNumberExcludingId(
            Long lotteryResultId,
            Long prizeStructureId,
            String winningNumber,
            Long excludeId
    ) {
        return lotteryResultDetailRepository
                .existsByLotteryResult_IdAndPrizeStructure_IdAndWinningNumberAndDeletedAtIsNullAndIdNot(
                        lotteryResultId,
                        prizeStructureId,
                        winningNumber,
                        excludeId
                );
    }

    @Override
    public void deleteById(Long id) {
        lotteryResultDetailRepository.findById(id).ifPresent(entity -> {
            entity.setDeletedAt(LocalDateTime.now());
            lotteryResultDetailRepository.save(entity);
        });
    }
}
