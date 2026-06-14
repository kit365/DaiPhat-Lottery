package com.daiphat.coreapi.infrastructure.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

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

    public Optional<Long> getTimeToLiveSeconds(String key) {
        Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        if (ttl < 0) {
            return Optional.empty();
        }
        return Optional.of(ttl);
    }

    public long increment(String key, long delta, Duration duration) {
        Long result = redisTemplate.opsForValue().increment(key, delta);
        if (duration != null && result != null && result == delta) {
            redisTemplate.expire(key, duration);
        }
        return result != null ? result : 0;
    }

    public void zadd(String key, Object value, double score) {
        redisTemplate.opsForZSet().add(key, value, score);
    }

    public void zrem(String key, Object... values) {
        redisTemplate.opsForZSet().remove(key, values);
    }

    public Set<Object> zrangeByScore(String key, double min, double max) {
        return redisTemplate.opsForZSet().rangeByScore(key, min, max);
    }
}
