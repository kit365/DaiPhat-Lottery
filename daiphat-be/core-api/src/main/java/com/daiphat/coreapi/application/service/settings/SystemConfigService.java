package com.daiphat.coreapi.application.service.settings;

import com.daiphat.coreapi.application.dto.request.settings.BulkUpdateVendorConfidencePolicyRequest;
import com.daiphat.coreapi.application.dto.request.settings.UpdateSystemConfigRequest;
import com.daiphat.coreapi.application.dto.response.settings.SystemConfigResponse;
import com.daiphat.coreapi.application.mapper.settings.SystemConfigApplicationMapper;
import com.daiphat.coreapi.application.port.in.settings.SystemConfigServicePort;
import com.daiphat.coreapi.application.port.in.streetagent.VendorConfidenceServicePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigCachePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.service.streetagent.VendorConfidencePolicyValidator;
import com.daiphat.coreapi.shared.util.SystemConfigValueValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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
    private final VendorConfidenceServicePort vendorConfidenceServicePort;

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
        boolean confidenceKey = isConfidenceConfigKey(model.getConfigKey());
        if (confidenceKey) {
            validateVendorConfidenceCrossFields(model, request.configValue());
        }
        systemConfigApplicationMapper.merge(request, model);
        SystemConfigModel saved = systemConfigRepositoryPort.save(model);

        systemConfigCachePort.evict(saved.getConfigKey());
        if (confidenceKey) {
            vendorConfidenceServicePort.recalculateAllProfiles();
        }

        log.info("Updated system config id={} key={}", saved.getId(), saved.getConfigKey());
        return systemConfigApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public List<SystemConfigResponse> bulkUpdateVendorConfidencePolicy(
            BulkUpdateVendorConfidencePolicyRequest request) {
        Map<SystemConfigEnum, String> proposed = new EnumMap<>(SystemConfigEnum.class);
        for (SystemConfigEnum key : SystemConfigEnum.values()) {
            if (VendorConfidencePolicyValidator.isConfidenceKey(key)) {
                proposed.put(key, key.getDefaultValue());
            }
        }

        Map<String, SystemConfigModel> modelsByKey = new java.util.HashMap<>();
        for (SystemConfigEnum key : proposed.keySet()) {
            SystemConfigModel model = systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                    .orElseThrow(() -> new DomainException(ErrorCode.SYSTEM_CONFIG_NOT_FOUND));
            modelsByKey.put(key.name(), model);
            proposed.put(key, model.getConfigValue() != null ? model.getConfigValue() : key.getDefaultValue());
        }

        for (Map.Entry<String, String> entry : request.values().entrySet()) {
            SystemConfigEnum key;
            try {
                key = SystemConfigEnum.valueOf(entry.getKey());
            } catch (IllegalArgumentException ex) {
                throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
            }
            if (!VendorConfidencePolicyValidator.isConfidenceKey(key)) {
                throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
            }
            SystemConfigModel model = modelsByKey.get(key.name());
            if (!Boolean.TRUE.equals(model.getIsEditable())) {
                throw new DomainException(ErrorCode.SYSTEM_CONFIG_NOT_EDITABLE);
            }
            SystemConfigValueValidator.validate(
                    entry.getValue(),
                    model.getDataType(),
                    model.getValidationRules(),
                    model.getConfigName());
            proposed.put(key, entry.getValue());
        }

        VendorConfidencePolicyValidator.validateFullPolicy(proposed);

        List<SystemConfigResponse> responses = new ArrayList<>();
        for (Map.Entry<String, String> entry : request.values().entrySet()) {
            SystemConfigModel model = modelsByKey.get(entry.getKey());
            model.setConfigValue(entry.getValue());
            SystemConfigModel saved = systemConfigRepositoryPort.save(model);
            systemConfigCachePort.evict(saved.getConfigKey());
            responses.add(systemConfigApplicationMapper.toResponse(saved));
        }

        // Evict every confidence key so readers never see a mixed cached set.
        for (SystemConfigEnum key : SystemConfigEnum.values()) {
            if (VendorConfidencePolicyValidator.isConfidenceKey(key)) {
                systemConfigCachePort.evict(key.name());
            }
        }

        vendorConfidenceServicePort.recalculateAllProfiles();
        log.info("Bulk-updated {} vendor confidence settings; profiles recalculated", responses.size());
        return responses;
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

    private boolean isConfidenceConfigKey(String configKey) {
        try {
            return VendorConfidencePolicyValidator.isConfidenceKey(SystemConfigEnum.valueOf(configKey));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private void validateVendorConfidenceCrossFields(SystemConfigModel model, String updatedValue) {
        SystemConfigEnum key;
        try {
            key = SystemConfigEnum.valueOf(model.getConfigKey());
        } catch (IllegalArgumentException ex) {
            return;
        }
        if (!VendorConfidencePolicyValidator.isConfidenceKey(key)) {
            return;
        }
        Map<SystemConfigEnum, String> current = new EnumMap<>(SystemConfigEnum.class);
        for (SystemConfigEnum candidate : SystemConfigEnum.values()) {
            if (!VendorConfidencePolicyValidator.isConfidenceKey(candidate)) {
                continue;
            }
            String value = systemConfigRepositoryPort.findActiveByConfigKey(candidate.name())
                    .map(SystemConfigModel::getConfigValue)
                    .orElse(candidate.getDefaultValue());
            current.put(candidate, value);
        }
        VendorConfidencePolicyValidator.validateUpdate(key, updatedValue, current);
    }
}
