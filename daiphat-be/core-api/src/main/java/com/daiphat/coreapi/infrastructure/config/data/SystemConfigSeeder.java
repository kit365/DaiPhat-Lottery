package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.infrastructure.persistence.entity.settings.SystemConfigEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.settings.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class SystemConfigSeeder {

    private final SystemConfigRepository configRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void syncConfigsWithEnum() {
        migrateLegacyConfigKeys();

        Set<String> enumKeys = Arrays.stream(SystemConfigEnum.values())
                .map(Enum::name)
                .collect(Collectors.toSet());

        List<SystemConfigEntity> dbConfigs = configRepository.findAll();
        Map<String, SystemConfigEntity> dbConfigMap = dbConfigs.stream()
                .collect(Collectors.toMap(SystemConfigEntity::getConfigKey, Function.identity()));

        int inserted = 0;
        int reactivated = 0;
        int metadataUpdated = 0;
        int defaultsFilled = 0;

        for (SystemConfigEnum enumConfig : SystemConfigEnum.values()) {
            String key = enumConfig.name();
            SystemConfigEntity dbConfig = dbConfigMap.get(key);

            if (dbConfig == null) {
                configRepository.save(SystemConfigEntity.builder()
                        .configKey(key)
                        .configValue(enumConfig.getDefaultValue())
                        .dataType(enumConfig.getDataType())
                        .configType(enumConfig.getConfigType())
                        .description(enumConfig.getDescription())
                        .configName(enumConfig.getConfigName())
                        .unit(enumConfig.getUnit())
                        .validationRules(enumConfig.getValidationRules())
                        .isEditable(enumConfig.isEditable())
                        .isActive(true)
                        .build());
                inserted++;
            } else {
                boolean changed = false;
                if (!Boolean.TRUE.equals(dbConfig.getIsActive())) {
                    dbConfig.setIsActive(true);
                    reactivated++;
                    changed = true;
                }
                if (syncMetadata(dbConfig, enumConfig)) {
                    metadataUpdated++;
                    changed = true;
                }
                // Fill blank values from enum defaults (e.g. newly added legal/contract fields).
                String currentValue = dbConfig.getConfigValue();
                String defaultValue = enumConfig.getDefaultValue();
                if ((currentValue == null || currentValue.isBlank())
                        && defaultValue != null
                        && !defaultValue.isBlank()) {
                    dbConfig.setConfigValue(defaultValue);
                    defaultsFilled++;
                    changed = true;
                }
                if (changed) {
                    configRepository.save(dbConfig);
                }
            }
        }

        int deactivated = 0;
        // Refresh after inserts / renames so deactivation sees current keys.
        dbConfigs = configRepository.findAll();
        for (SystemConfigEntity dbConfig : dbConfigs) {
            if (!enumKeys.contains(dbConfig.getConfigKey()) && Boolean.TRUE.equals(dbConfig.getIsActive())) {
                dbConfig.setIsActive(false);
                configRepository.save(dbConfig);
                deactivated++;
            }
        }

        log.info(
                "System: Synchronized system_config with enum — inserted={}, reactivated={}, metadataUpdated={}, defaultsFilled={}, deactivated={}.",
                inserted,
                reactivated,
                metadataUpdated,
                defaultsFilled,
                deactivated
        );
    }

    /**
     * Renames legacy keys in-place so live values are preserved across enum renames.
     */
    private void migrateLegacyConfigKeys() {
        deactivateLegacyConfigKey("PAYMENT_CUTOFF_TIME");
        deactivateLegacyConfigKey("RECONCILIATION_START");
        deactivateLegacyConfigKey("VERIFICATION_DEADLINE");
        bumpDefaultIfUnchanged("RETURN_REMINDER_TIME", "15", "10");
    }

    /**
     * Updates a shipped default when the live value still equals the previous product default.
     */
    private void bumpDefaultIfUnchanged(String configKey, String previousDefault, String newDefault) {
        configRepository.findByConfigKey(configKey).ifPresent(config -> {
            String value = config.getConfigValue();
            if (value != null && value.trim().equals(previousDefault)) {
                config.setConfigValue(newDefault);
                configRepository.save(config);
                log.info("System: Updated {} default {} → {}.", configKey, previousDefault, newDefault);
            }
        });
    }

    private void deactivateLegacyConfigKey(String legacyKey) {
        configRepository.findByConfigKey(legacyKey).ifPresent(legacy -> {
            if (Boolean.TRUE.equals(legacy.getIsActive())) {
                legacy.setIsActive(false);
                configRepository.save(legacy);
                log.info("System: Deactivated legacy system_config key {}.", legacyKey);
            }
        });
    }

    /**
     * Syncs enum-owned metadata without overwriting live configValue.
     *
     * @return true if any metadata field changed
     */
    private boolean syncMetadata(SystemConfigEntity dbConfig, SystemConfigEnum enumConfig) {
        boolean changed = false;
        if (dbConfig.getConfigType() != enumConfig.getConfigType()) {
            dbConfig.setConfigType(enumConfig.getConfigType());
            changed = true;
        }
        if (dbConfig.getDataType() != enumConfig.getDataType()) {
            dbConfig.setDataType(enumConfig.getDataType());
            changed = true;
        }
        if (!Objects.equals(dbConfig.getDescription(), enumConfig.getDescription())) {
            dbConfig.setDescription(enumConfig.getDescription());
            changed = true;
        }
        if (!Objects.equals(dbConfig.getConfigName(), enumConfig.getConfigName())) {
            dbConfig.setConfigName(enumConfig.getConfigName());
            changed = true;
        }
        if (!Objects.equals(dbConfig.getUnit(), enumConfig.getUnit())) {
            dbConfig.setUnit(enumConfig.getUnit());
            changed = true;
        }
        if (!Objects.equals(dbConfig.getValidationRules(), enumConfig.getValidationRules())) {
            dbConfig.setValidationRules(enumConfig.getValidationRules());
            changed = true;
        }
        if (!Objects.equals(dbConfig.getIsEditable(), enumConfig.isEditable())) {
            dbConfig.setIsEditable(enumConfig.isEditable());
            changed = true;
        }
        return changed;
    }
}
