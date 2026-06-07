package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.blog.keys.BlogCacheKeyGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-317] RedisBlogViewCacheAdapter Unit Tests")
class RedisBlogViewCacheAdapterTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    private RedisBlogViewCacheAdapter adapter;
    private final String viewKey = BlogCacheKeyGenerator.postViews();
    private final String syncKey = BlogCacheKeyGenerator.postViewsSync();

    @BeforeEach
    void setUp() {
        adapter = new RedisBlogViewCacheAdapter(redisTemplate);
    }

    @Test
    void incrementViewCount_success() {
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        adapter.incrementViewCount(1L);
        verify(hashOperations).increment(viewKey, "1", 1);
    }

    @Test
    void hasViewCount_success() {
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        when(hashOperations.hasKey(viewKey, "1")).thenReturn(true);
        
        boolean result = adapter.hasViewCount(1L);
        
        assertThat(result).isTrue();
    }

    @Test
    void getAndClearViewsToSync_noSyncKey_noViewKey_returnsEmpty() {
        when(redisTemplate.hasKey(syncKey)).thenReturn(false);
        when(redisTemplate.hasKey(viewKey)).thenReturn(false);

        Map<Long, Integer> result = adapter.getAndClearViewsToSync();

        assertThat(result).isEmpty();
    }

    @Test
    void getAndClearViewsToSync_noSyncKey_hasViewKey_renamesAndProcesses() {
        when(redisTemplate.hasKey(syncKey)).thenReturn(false);
        when(redisTemplate.hasKey(viewKey)).thenReturn(true);
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        when(hashOperations.entries(syncKey)).thenReturn(Map.of("1", "10", "2", "5"));

        Map<Long, Integer> result = adapter.getAndClearViewsToSync();

        verify(redisTemplate).rename(viewKey, syncKey);
        verify(redisTemplate).delete(syncKey);
        
        assertThat(result).containsEntry(1L, 10).containsEntry(2L, 5);
    }

    @Test
    void getAndClearViewsToSync_hasSyncKey_processes() {
        when(redisTemplate.hasKey(syncKey)).thenReturn(true);
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        when(hashOperations.entries(syncKey)).thenReturn(Map.of("1", "10"));

        Map<Long, Integer> result = adapter.getAndClearViewsToSync();

        verify(redisTemplate, never()).rename(anyString(), anyString());
        verify(redisTemplate).delete(syncKey);
        
        assertThat(result).containsEntry(1L, 10);
    }

    @Test
    void getAndClearViewsToSync_entriesEmpty_deletesSyncKeyAndReturnsEmpty() {
        when(redisTemplate.hasKey(syncKey)).thenReturn(true);
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        when(hashOperations.entries(syncKey)).thenReturn(Collections.emptyMap());

        Map<Long, Integer> result = adapter.getAndClearViewsToSync();

        verify(redisTemplate).delete(syncKey);
        assertThat(result).isEmpty();
    }
}
