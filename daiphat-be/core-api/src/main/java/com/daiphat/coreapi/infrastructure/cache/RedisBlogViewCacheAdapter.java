package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.blog.BlogViewCachePort;
import com.daiphat.coreapi.application.port.out.blog.keys.BlogCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisBlogViewCacheAdapter implements BlogViewCachePort {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String VIEW_KEY = BlogCacheKeyGenerator.postViews();
    private static final String SYNC_KEY = BlogCacheKeyGenerator.postViewsSync();

    @Override
    public void incrementViewCount(Long id) {
        redisTemplate.opsForHash().increment(VIEW_KEY, id.toString(), 1);
    }

    @Override
    public boolean hasViewCount(Long id) {
        return Boolean.TRUE.equals(redisTemplate.opsForHash().hasKey(VIEW_KEY, id.toString()));
    }

    @Override
    public Map<Long, Integer> getAndClearViewsToSync() {
        // 1. Process any leftover sync key from a previous failed run
        Boolean hasSyncKey = redisTemplate.hasKey(SYNC_KEY);
        if (!Boolean.TRUE.equals(hasSyncKey)) {
            // Rename current viewKey to syncKey
            Boolean hasViewKey = redisTemplate.hasKey(VIEW_KEY);
            if (Boolean.TRUE.equals(hasViewKey)) {
                try {
                    redisTemplate.rename(VIEW_KEY, SYNC_KEY);
                } catch (Exception e) {
                    log.error("Failed to rename Redis key for blog view count sync", e);
                    return Collections.emptyMap();
                }
            } else {
                return Collections.emptyMap();
            }
        }

        Map<Object, Object> entries = redisTemplate.opsForHash().entries(SYNC_KEY);
        if (entries == null || entries.isEmpty()) {
            redisTemplate.delete(SYNC_KEY);
            return Collections.emptyMap();
        }

        Map<Long, Integer> result = new HashMap<>();
        for (Map.Entry<Object, Object> entry : entries.entrySet()) {
            try {
                Long blogId = Long.parseLong(entry.getKey().toString());
                Integer increment = Integer.parseInt(entry.getValue().toString());
                if (increment > 0) {
                    result.put(blogId, increment);
                }
            } catch (Exception e) {
                log.error("Failed to parse view count for blog post: key={}, value={}", entry.getKey(), entry.getValue(), e);
            }
        }

        // Delete sync key after loading
        redisTemplate.delete(SYNC_KEY);
        return result;
    }
}
