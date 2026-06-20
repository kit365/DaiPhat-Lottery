package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryResultPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LotteryResultRepositoryAdapter implements LotteryResultRepositoryPort {

    private final LotteryResultRepository lotteryResultRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final LotteryResultPersistenceMapper lotteryResultPersistenceMapper;

    @Override
    public LotteryResultModel save(LotteryResultModel model) {
        LotteryResultEntity entity = lotteryResultPersistenceMapper.toEntity(model);
        if (model.getStationId() != null) {
            entity.setStation(lotteryStationRepository.getReferenceById(model.getStationId()));
        }
        return lotteryResultPersistenceMapper.toDomain(lotteryResultRepository.save(entity));
    }

    @Override
    public Optional<LotteryResultModel> findById(Long id) {
        return lotteryResultRepository.findByIdAndDeletedAtIsNull(id)
                .map(lotteryResultPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryResultModel> findAll(Pageable pageable) {
        return lotteryResultRepository.findAllByDeletedAtIsNullOrderByDrawDateDescIdDesc(pageable)
                .map(lotteryResultPersistenceMapper::toDomain);
    }

    @Override
    public Optional<LotteryResultModel> findByStationIdAndDrawDate(Long stationId, LocalDate drawDate) {
        return lotteryResultRepository.findByStation_IdAndDrawDateAndDeletedAtIsNull(stationId, drawDate)
                .map(lotteryResultPersistenceMapper::toDomain);
    }

    @Override
    public int updateRequestedAt(Long id, LocalDateTime requestedAt) {
        return lotteryResultRepository.updateRequestedAt(id, requestedAt);
    }

    @Override
    public boolean existsByStationIdAndDrawDate(Long stationId, LocalDate drawDate) {
        return lotteryResultRepository.existsByStation_IdAndDrawDateAndDeletedAtIsNull(stationId, drawDate);
    }

    @Override
    public boolean existsByStationIdAndDrawDateExcludingId(Long stationId, LocalDate drawDate, Long excludeId) {
        return lotteryResultRepository.existsByStation_IdAndDrawDateAndDeletedAtIsNullAndIdNot(
                stationId, drawDate, excludeId
        );
    }

    @Override
    public int updateStatusIfCurrentIn(
            Long id,
            List<String> allowedStatuses,
            String nextStatus,
            String source,
            LocalDateTime updatedAt,
            String lastModifiedBy
    ) {
        List<LotteryResultStatus> allowed = allowedStatuses.stream()
                .map(LotteryResultStatus::valueOf)
                .toList();
        return lotteryResultRepository.updateStatusIfCurrentIn(
                id,
                allowed,
                LotteryResultStatus.valueOf(nextStatus),
                source,
                updatedAt,
                lastModifiedBy
        );
    }

    @Override
    public List<LotteryResultModel> findHistoricalResultsWithoutDetails(
            LocalDate beforeDate,
            List<String> statuses,
            int limit
    ) {
        List<LotteryResultStatus> statusEnums = statuses.stream()
                .map(LotteryResultStatus::valueOf)
                .toList();
        return lotteryResultPersistenceMapper.toDomainList(
                lotteryResultRepository.findHistoricalResultsWithoutDetails(
                        beforeDate,
                        statusEnums,
                        PageRequest.of(0, Math.max(limit, 1))
                )
        );
    }

    @Override
    public void deleteById(Long id) {
        lotteryResultRepository.findById(id).ifPresent(entity -> {
            entity.setDeletedAt(LocalDateTime.now());
            lotteryResultRepository.save(entity);
        });
    }
}
