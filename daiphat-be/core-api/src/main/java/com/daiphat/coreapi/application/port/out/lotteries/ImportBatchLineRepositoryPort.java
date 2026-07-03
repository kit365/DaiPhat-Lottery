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

    boolean existsByStationAndDrawDateAndBatchType(Long stationId, LocalDate drawDate, ImportBatchType batchType);
}
