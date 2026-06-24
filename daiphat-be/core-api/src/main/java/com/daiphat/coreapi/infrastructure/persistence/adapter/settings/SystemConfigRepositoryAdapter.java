package com.daiphat.coreapi.infrastructure.persistence.adapter.settings;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.settings.SystemConfigPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.settings.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class SystemConfigRepositoryAdapter implements SystemConfigRepositoryPort {

    private final SystemConfigRepository systemConfigRepository;
    private final SystemConfigPersistenceMapper systemConfigPersistenceMapper;

    @Override
    public List<SystemConfigModel> findAll() {
        return systemConfigRepository.findAllByIsActiveTrueOrderByConfigTypeAscConfigKeyAsc().stream()
                .map(systemConfigPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<SystemConfigModel> findByConfigType(ConfigType configType) {
        return systemConfigRepository.findByConfigTypeAndIsActiveTrueOrderByConfigKeyAsc(configType).stream()
                .map(systemConfigPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<SystemConfigModel> findById(Long id) {
        return systemConfigRepository.findByIdAndIsActiveTrue(id)
                .map(systemConfigPersistenceMapper::toDomain);
    }

    @Override
    public SystemConfigModel save(SystemConfigModel model) {
        return systemConfigPersistenceMapper.toDomain(
                systemConfigRepository.save(systemConfigPersistenceMapper.toEntity(model))
        );
    }
}
