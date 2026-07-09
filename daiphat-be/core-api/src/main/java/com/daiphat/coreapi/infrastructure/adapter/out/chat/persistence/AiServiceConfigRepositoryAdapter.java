package com.daiphat.coreapi.infrastructure.adapter.out.chat.persistence;

import com.daiphat.coreapi.application.port.out.chat.AiServiceConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.AiServiceConfigModel;
import com.daiphat.coreapi.domain.model.enums.chat.AiServiceName;
import com.daiphat.coreapi.infrastructure.persistence.mapper.chat.AiServiceConfigPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.chat.AiServiceConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AiServiceConfigRepositoryAdapter implements AiServiceConfigRepositoryPort {

    private final AiServiceConfigRepository aiServiceConfigRepository;
    private final AiServiceConfigPersistenceMapper aiServiceConfigPersistenceMapper;

    @Override
    public Optional<AiServiceConfigModel> findActiveByServiceName(AiServiceName serviceName) {
        return aiServiceConfigRepository.findByServiceNameAndActiveTrueAndDeletedAtIsNull(serviceName)
                .map(aiServiceConfigPersistenceMapper::toModel);
    }
}
