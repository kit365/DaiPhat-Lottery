package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.blog.keys.BlogCacheKeyGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-322] RedisBlogPostPublishQueueAdapter Unit Tests")
class RedisBlogPostPublishQueueAdapterTest {

    @Mock
    private RedisClient redisClient;

    private RedisBlogPostPublishQueueAdapter adapter;
    private final String queueKey = BlogCacheKeyGenerator.scheduledPostsQueue();

    @BeforeEach
    void setUp() {
        adapter = new RedisBlogPostPublishQueueAdapter(redisClient);
    }

    @Test
    void schedulePost_success() {
        Long postId = 1L;
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1);
        long score = scheduledAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();

        adapter.schedulePost(postId, scheduledAt);

        verify(redisClient).zadd(eq(queueKey), eq("1"), eq((double) score));
    }

    @Test
    void schedulePost_nullArgs_doNothing() {
        adapter.schedulePost(null, LocalDateTime.now());
        adapter.schedulePost(1L, null);

        verifyNoInteractions(redisClient);
    }

    @Test
    void cancelScheduledPost_success() {
        adapter.cancelScheduledPost(1L);

        verify(redisClient).zrem(queueKey, "1");
    }

    @Test
    void cancelScheduledPost_nullId_doNothing() {
        adapter.cancelScheduledPost(null);

        verifyNoInteractions(redisClient);
    }

    @Test
    void getDuePosts_success() {
        LocalDateTime now = LocalDateTime.now();
        long maxScore = now.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        
        when(redisClient.zrangeByScore(eq(queueKey), eq(0.0), eq((double) maxScore)))
                .thenReturn(Set.of("1", "2"));

        Set<Long> duePosts = adapter.getDuePosts(now);

        assertThat(duePosts).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void getDuePosts_emptyResult() {
        LocalDateTime now = LocalDateTime.now();
        long maxScore = now.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        
        when(redisClient.zrangeByScore(eq(queueKey), eq(0.0), eq((double) maxScore)))
                .thenReturn(Collections.emptySet());

        Set<Long> duePosts = adapter.getDuePosts(now);

        assertThat(duePosts).isEmpty();
    }

    @Test
    void getDuePosts_nullNow_returnEmpty() {
        Set<Long> duePosts = adapter.getDuePosts(null);

        assertThat(duePosts).isEmpty();
        verifyNoInteractions(redisClient);
    }

    @Test
    void removePosts_success() {
        adapter.removePosts(Set.of(1L, 2L));

        verify(redisClient).zrem(eq(queueKey), any(Object[].class));
    }

    @Test
    void removePosts_emptyIds_doNothing() {
        adapter.removePosts(Collections.emptySet());
        adapter.removePosts(null);

        verifyNoInteractions(redisClient);
    }
}
