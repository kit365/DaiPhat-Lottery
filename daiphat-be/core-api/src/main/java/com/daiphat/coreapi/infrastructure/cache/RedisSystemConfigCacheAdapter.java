package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigCachePort;
import com.daiphat.coreapi.application.port.out.settings.keys.SystemConfigCacheKeyGenerator;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisSystemConfigCacheAdapter implements SystemConfigCachePort {

    private final RedisClient redisClient;

    @Override
    public Optional<SystemConfigModel> get(String configKey) {
        if (configKey == null || configKey.isBlank()) {
            return Optional.empty();
        }
        try {
            return redisClient.get(SystemConfigCacheKeyGenerator.byKey(configKey), SystemConfigModel.class);
        } catch (RuntimeException exception) {
            log.warn("System-config cache unavailable for key {}; falling back to database: {}",
                    configKey, exception.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void put(String configKey, SystemConfigModel model, Duration ttl) {
        if (configKey == null || configKey.isBlank() || model == null) {
            return;
        }
        try {
            if (ttl == null || ttl.isNegative() || ttl.isZero()) {
                redisClient.set(SystemConfigCacheKeyGenerator.byKey(configKey), model);
                return;
            }
            redisClient.set(SystemConfigCacheKeyGenerator.byKey(configKey), model, ttl);
        } catch (RuntimeException exception) {
            log.warn("Could not cache system-config key {}; continuing without cache: {}",
                    configKey, exception.getMessage());
        }
    }

    @Override
    public void evict(String configKey) {
        if (configKey == null || configKey.isBlank()) {
            return;
        }
        try {
            redisClient.delete(SystemConfigCacheKeyGenerator.byKey(configKey));
        } catch (RuntimeException exception) {
            log.warn("Could not evict system-config key {}; database value remains authoritative: {}",
                    configKey, exception.getMessage());
        }
    }
}
