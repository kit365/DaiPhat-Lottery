package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ImportBatchLineRepositoryPort {

    ImportBatchLineModel save(ImportBatchLineModel model);

    Optional<ImportBatchLineModel> findById(Long id);

    List<ImportBatchLineModel> findByImportBatchId(Long importBatchId);

    Optional<ImportBatchLineModel> findDeletedByImportBatchIdAndStationId(Long importBatchId, Long lotteryStationId);

    long countActiveByImportBatchId(Long importBatchId);

    boolean existsByStationAndDrawDateAndBatchType(Long stationId, LocalDate drawDate, ImportBatchType batchType);

    boolean existsDraftLineForStationAndDrawDate(Long stationId, LocalDate drawDate);

    boolean existsDraftLineForStationAndDrawDateExcludingBatch(
            Long stationId,
            LocalDate drawDate,
            Long excludeBatchId
    );

    boolean existsNonDraftLineForStationAndDrawDate(Long stationId, LocalDate drawDate);

    Optional<Long> findDraftBatchIdForStationAndDrawDate(Long stationId, LocalDate drawDate);

    Optional<Long> findDraftBatchIdForStationAndDrawDateExcludingBatch(
            Long stationId,
            LocalDate drawDate,
            Long excludeBatchId
    );

    List<Long> findEligibleStationIdsBySupplierAndDrawDate(Long supplierId, LocalDate drawDate);

    /**
     * Non-cancelled import lines for supplier + station + draw date (source for return summary).
     */
    List<ImportBatchLineModel> findEligibleBySupplierStationAndDrawDate(
            Long supplierId,
            Long stationId,
            LocalDate drawDate
    );

    long nextLineBatchCodeSequence();

    /** @deprecated use {@link #nextLineBatchCodeSequence()} */
    @Deprecated
    default long nextBatchCodeSequence() {
        return nextLineBatchCodeSequence();
    }
}
