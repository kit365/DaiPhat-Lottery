package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.TrainingDatasetExportModel;

import java.util.List;
import java.util.Optional;

public interface TrainingDatasetExportRepositoryPort {

    TrainingDatasetExportModel save(TrainingDatasetExportModel model);

    Optional<TrainingDatasetExportModel> findById(Long id);

    List<TrainingDatasetExportModel> findAll();
}
