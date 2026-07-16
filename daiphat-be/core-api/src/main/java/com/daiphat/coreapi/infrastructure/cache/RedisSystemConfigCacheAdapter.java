package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigCachePort;
import com.daiphat.coreapi.application.port.out.settings.keys.SystemConfigCacheKeyGenerator;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisSystemConfigCacheAdapter implements SystemConfigCachePort {

    private final RedisClient redisClient;

    @Override
    public Optional<SystemConfigModel> get(String configKey) {
        if (configKey == null || configKey.isBlank()) {
            return Optional.empty();
        }
        return redisClient.get(SystemConfigCacheKeyGenerator.byKey(configKey), SystemConfigModel.class);
    }

    @Override
    public void put(String configKey, SystemConfigModel model, Duration ttl) {
        if (configKey == null || configKey.isBlank() || model == null) {
            return;
        }
        if (ttl == null || ttl.isNegative() || ttl.isZero()) {
            redisClient.set(SystemConfigCacheKeyGenerator.byKey(configKey), model);
            return;
        }
        redisClient.set(SystemConfigCacheKeyGenerator.byKey(configKey), model, ttl);
    }

    @Override
    public void evict(String configKey) {
        if (configKey == null || configKey.isBlank()) {
            return;
        }
        redisClient.delete(SystemConfigCacheKeyGenerator.byKey(configKey));
    }
}
