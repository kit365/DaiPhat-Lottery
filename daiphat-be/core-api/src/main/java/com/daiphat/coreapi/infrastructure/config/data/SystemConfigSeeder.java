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
        Set<String> enumKeys = Arrays.stream(SystemConfigEnum.values())
                .map(Enum::name)
                .collect(Collectors.toSet());

        List<SystemConfigEntity> dbConfigs = configRepository.findAll();
        Map<String, SystemConfigEntity> dbConfigMap = dbConfigs.stream()
                .collect(Collectors.toMap(SystemConfigEntity::getConfigKey, Function.identity()));

        int inserted = 0;
        int reactivated = 0;

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
                        .isActive(true)
                        .build());
                inserted++;
            } else if (!Boolean.TRUE.equals(dbConfig.getIsActive())) {
                dbConfig.setIsActive(true);
                configRepository.save(dbConfig);
                reactivated++;
            }
        }

        int deactivated = 0;
        for (SystemConfigEntity dbConfig : dbConfigs) {
            if (!enumKeys.contains(dbConfig.getConfigKey()) && Boolean.TRUE.equals(dbConfig.getIsActive())) {
                dbConfig.setIsActive(false);
                configRepository.save(dbConfig);
                deactivated++;
            }
        }

        log.info(
                "System: Synchronized system_config with enum — inserted={}, reactivated={}, deactivated={}.",
                inserted,
                reactivated,
                deactivated
        );
    }
}
