package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OcrScanResultRepositoryPort {

    OcrScanResultModel save(OcrScanResultModel model);

    Optional<OcrScanResultModel> findById(Long id);

    /**
     * Filters soft-deleted rows out. When both filters are set, both must match.
     */
    List<OcrScanResultModel> findAll(String scanId, Long importBatchLineId);

    /**
     * Soft-deleted excluded. Any combination of filters may be null
     * (date-only export for Phase 4 retrain loop).
     */
    List<OcrScanResultModel> findAll(
            String scanId,
            Long importBatchLineId,
            LocalDate fromDate,
            LocalDate toDate
    );

    List<OcrScanResultModel> findByAiModelId(Long aiModelId);
}
