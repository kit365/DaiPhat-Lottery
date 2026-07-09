package com.daiphat.coreapi.application.port.out.settings;

import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;

import java.util.List;
import java.util.Optional;

public interface SystemConfigRepositoryPort {

    List<SystemConfigModel> findAll();

    List<SystemConfigModel> findByConfigType(ConfigType configType);

    Optional<SystemConfigModel> findById(Long id);

    Optional<SystemConfigModel> findByConfigKey(String configKey);

    Optional<SystemConfigModel> findActiveByConfigKey(String configKey);

    SystemConfigModel save(SystemConfigModel model);
}
