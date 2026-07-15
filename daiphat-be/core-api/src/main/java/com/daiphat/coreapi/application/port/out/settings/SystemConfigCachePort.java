package com.daiphat.coreapi.application.port.out.settings;

import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;

import java.time.Duration;
import java.util.Optional;

/**
 * Cache port for SystemConfig lookups by business key.
 * Values are frequently read by business flows; write paths must evict.
 */
public interface SystemConfigCachePort {

    Optional<SystemConfigModel> get(String configKey);

    void put(String configKey, SystemConfigModel model, Duration ttl);

    void evict(String configKey);
}
