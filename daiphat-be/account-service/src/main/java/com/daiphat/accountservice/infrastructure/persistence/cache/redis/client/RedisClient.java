package com.daiphat.accountservice.infrastructure.persistence.cache.redis.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RedisClient {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public void set(String key, Object value) {
        redisTemplate.opsForValue().set(key, value);
    }

    public void set(String key, Object value, Duration duration) {
        redisTemplate.opsForValue().set(key, value, duration);
    }

    public boolean setIfAbsent(String key, Object value, Duration duration) {
        return Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(key, value, duration));
    }

    public <T> Optional<T> get(String key, Class<T> type) {
        Object value = redisTemplate.opsForValue().get(key);
        if (value == null) {
            return Optional.empty();
        }

        if (type.isInstance(value)) {
            return Optional.of(type.cast(value));
        }

        return Optional.ofNullable(objectMapper.convertValue(value, type));
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }

    public boolean exists(String key) {
        return redisTemplate.hasKey(key);
    }

    public void expire(String key, Duration duration) {
        redisTemplate.expire(key, duration);
    }

    public void hset(String key, String field, Object value) {
        redisTemplate.opsForHash().put(key, field, value);
    }

    public <T> Optional<T> hget(String key, String field, Class<T> type) {
        Object value = redisTemplate.opsForHash().get(key, field);
        if (value == null) {
            return Optional.empty();
        }

        if (type.isInstance(value)) {
            return Optional.of(type.cast(value));
        }

        return Optional.ofNullable(objectMapper.convertValue(value, type));
    }

    public long increment(String key, long delta, Duration duration) {
        Long result = redisTemplate.opsForValue().increment(key, delta);
        if (duration != null && result != null && result == delta) {
            redisTemplate.expire(key, duration);
        }
        return result != null ? result : 0;
    }
}
