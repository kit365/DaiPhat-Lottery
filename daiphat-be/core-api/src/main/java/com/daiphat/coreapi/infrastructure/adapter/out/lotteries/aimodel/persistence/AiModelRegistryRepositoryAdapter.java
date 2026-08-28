package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.aimodel.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.AiModelRegistryRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.AiModelRegistryModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.AiModelPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.AiModelRegistryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AiModelRegistryRepositoryAdapter implements AiModelRegistryRepositoryPort {

    private final AiModelRegistryRepository repository;
    private final AiModelPersistenceMapper mapper;

    @Override
    public Optional<AiModelRegistryModel> findById(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id).map(mapper::toDomain);
    }

    @Override
    public List<AiModelRegistryModel> findAllActive() {
        return repository.findByDeletedAtIsNullOrderByProviderAscModelNameAsc().stream()
                .map(mapper::toDomain)
                .filter(AiModelRegistryModel::isActive)
                .toList();
    }

    @Override
    public Optional<AiModelRegistryModel> findDefaultActiveByProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            return Optional.empty();
        }
        return repository.findByProviderIgnoreCaseAndIsDefaultTrueAndActiveTrueAndDeletedAtIsNull(provider.trim())
                .map(mapper::toDomain);
    }

    @Override
    public Optional<AiModelRegistryModel> findAnyActiveDefault() {
        return repository.findFirstByIsDefaultTrueAndActiveTrueAndDeletedAtIsNull().map(mapper::toDomain);
    }

    @Override
    public AiModelRegistryModel save(AiModelRegistryModel model) {
        return mapper.toDomain(repository.save(mapper.toEntity(model)));
    }
}
