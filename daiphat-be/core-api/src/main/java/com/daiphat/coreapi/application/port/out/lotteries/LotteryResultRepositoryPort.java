package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LotteryResultRepositoryPort {

    LotteryResultModel save(LotteryResultModel model);

    Optional<LotteryResultModel> findById(Long id);

    Page<LotteryResultModel> findAll(Pageable pageable);

    Optional<LotteryResultModel> findByStationIdAndDrawDate(Long stationId, LocalDate drawDate);

    int updateRequestedAt(Long id, LocalDateTime requestedAt);

    boolean existsByStationIdAndDrawDate(Long stationId, LocalDate drawDate);

    boolean existsByStationIdAndDrawDateExcludingId(Long stationId, LocalDate drawDate, Long excludeId);

    int updateStatusIfCurrentIn(
            Long id,
            List<String> allowedStatuses,
            String nextStatus,
            String source,
            LocalDateTime updatedAt,
            String lastModifiedBy
    );

    List<LotteryResultModel> findHistoricalResultsWithoutDetails(
            LocalDate beforeDate,
            List<String> statuses,
            int limit
    );

    void deleteById(Long id);
}
