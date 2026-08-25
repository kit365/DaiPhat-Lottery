package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;

import java.util.List;
import java.util.Optional;

public interface OcrScanResultRepositoryPort {

    OcrScanResultModel save(OcrScanResultModel model);

    Optional<OcrScanResultModel> findById(Long id);

    /**
     * Filters soft-deleted rows out. When both filters are set, both must match.
     */
    List<OcrScanResultModel> findAll(String scanId, Long importBatchLineId);
}
