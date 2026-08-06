package com.daiphat.coreapi.application.service.settings;

import com.daiphat.coreapi.application.dto.request.settings.UpdateSystemConfigRequest;
import com.daiphat.coreapi.application.dto.response.settings.SystemConfigResponse;
import com.daiphat.coreapi.application.mapper.settings.SystemConfigApplicationMapper;
import com.daiphat.coreapi.application.port.in.settings.SystemConfigServicePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigCachePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.shared.util.SystemConfigValueValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemConfigService implements SystemConfigServicePort {

    /** Safety-net TTL; successful updates always evict immediately. */
    static final Duration CACHE_TTL = Duration.ofMinutes(15);

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final SystemConfigCachePort systemConfigCachePort;
    private final SystemConfigApplicationMapper systemConfigApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<SystemConfigResponse> getAll(String configType) {
        List<SystemConfigModel> models = configType == null || configType.isBlank()
                ? systemConfigRepositoryPort.findAll()
                : systemConfigRepositoryPort.findByConfigType(parseConfigType(configType));
        return models.stream()
                .map(systemConfigApplicationMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<SystemConfigModel> getConfigByKey(String configKey) {
        if (configKey == null || configKey.isBlank()) {
            return Optional.empty();
        }

        Optional<SystemConfigModel> cached = systemConfigCachePort.get(configKey);
        if (cached.isPresent()) {
            return cached;
        }

        Optional<SystemConfigModel> fromDb = systemConfigRepositoryPort.findActiveByConfigKey(configKey);
        fromDb.ifPresent(model -> systemConfigCachePort.put(configKey, model, CACHE_TTL));
        return fromDb;
    }

    @Override
    @Transactional
    public SystemConfigResponse update(Long id, UpdateSystemConfigRequest request) {
        SystemConfigModel model = getConfigOrThrow(id);
        if (!Boolean.TRUE.equals(model.getIsEditable())) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_NOT_EDITABLE);
        }
        SystemConfigValueValidator.validate(
                request.configValue(),
                model.getDataType(),
                model.getValidationRules(),
                model.getConfigName());
        systemConfigApplicationMapper.merge(request, model);
        SystemConfigModel saved = systemConfigRepositoryPort.save(model);

        // Ensure subsequent getConfigByKey reads see the fresh value immediately.
        systemConfigCachePort.evict(saved.getConfigKey());

        log.info("Updated system config id={} key={}", saved.getId(), saved.getConfigKey());
        return systemConfigApplicationMapper.toResponse(saved);
    }

    private SystemConfigModel getConfigOrThrow(Long id) {
        return systemConfigRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.SYSTEM_CONFIG_NOT_FOUND));
    }

    private ConfigType parseConfigType(String configType) {
        try {
            return ConfigType.valueOf(configType.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(
                    ErrorCode.SYSTEM_CONFIG_TYPE_INVALID,
                    "Giá trị configType hợp lệ: " + Arrays.toString(ConfigType.values())
            );
        }
    }
}
