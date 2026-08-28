package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.aimodel.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.TrainingDatasetExportRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.TrainingDatasetExportModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.AiModelPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.TrainingDatasetExportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class TrainingDatasetExportRepositoryAdapter implements TrainingDatasetExportRepositoryPort {

    private final TrainingDatasetExportRepository repository;
    private final AiModelPersistenceMapper mapper;

    @Override
    public TrainingDatasetExportModel save(TrainingDatasetExportModel model) {
        return mapper.toDomain(repository.save(mapper.toEntity(model)));
    }

    @Override
    public Optional<TrainingDatasetExportModel> findById(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id).map(mapper::toDomain);
    }

    @Override
    public List<TrainingDatasetExportModel> findAll() {
        return repository.findByDeletedAtIsNullOrderByCreatedAtDesc().stream()
                .map(mapper::toDomain)
                .toList();
    }
}
